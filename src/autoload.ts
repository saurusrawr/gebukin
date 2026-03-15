/*
  Saurus For You 💌 
*/
import { Application, Request, Response, NextFunction } from 'express'
import * as fs from 'fs'
import * as path from 'path'
import axios from 'axios'
import TelegramBot from 'node-telegram-bot-api'

let regRouter = new Set<string>()
let currentConfig: any = null
let appInstance: Application

// Premium keys cache
let premiumKeys: string[] = []
let premiumKeyLastFetch: number = 0
const PREMIUM_KEY_CACHE_TTL = 60 * 1000

let telegramToken: string = ''
const TELEGRAM_CHAT_ID = '-1003641120736'

// ========================
// MENU EFFECTS
// ========================
const menuEffects = [
  '5104841245755180586', // 🔥
  '5107584321108051014', // ❤️
  '5159385139981059251', // 🎺
  '5046509860389126442'  // 👍
]

function effectMsg(chatType: string): object {
  if (chatType !== 'private') return {}
  const effect = menuEffects[Math.floor(Math.random() * menuEffects.length)]
  return effect ? { message_effect_id: effect } : {}
}

// ========================
// IP BLOCK
// ========================
let blockedIPs: Set<string> = new Set()
let maintenanceOverride: boolean | null = null

async function loadBlockedIPs() {
  try {
    const raw = await githubGet('blockedip.json')
    blockedIPs = new Set(JSON.parse(raw))
    console.log(`[Block] Loaded ${blockedIPs.size} blocked IPs from GitHub`)
  } catch {
    blockedIPs = new Set()
    console.log('[Block] blockedip.json belum ada, mulai kosong')
  }
}

async function saveBlockedIPs() {
  try {
    await githubUpdate('blockedip.json', JSON.stringify([...blockedIPs], null, 2), '[bot] update blocked IPs')
  } catch (e: any) {
    console.error('[Block] Gagal simpan ke GitHub:', e.message)
  }
}

// ========================
// SPAM DETECTION
// ========================
const SPAM_WINDOW_MS = 10_000   // 10 detik
const SPAM_MAX_REQ   = 15       // max request per window
const spamMap = new Map<string, { count: number, firstSeen: number, warned: boolean }>()

function checkSpam(ip: string): boolean {
  const now = Date.now()
  const entry = spamMap.get(ip)

  if (!entry || now - entry.firstSeen > SPAM_WINDOW_MS) {
    spamMap.set(ip, { count: 1, firstSeen: now, warned: false })
    return false
  }

  entry.count++
  spamMap.set(ip, entry)

  if (entry.count >= SPAM_MAX_REQ && !entry.warned) {
    entry.warned = true
    blockedIPs.add(ip)
    saveBlockedIPs()
    notifySpamBlock(ip).catch(() => {})
    return true
  }

  return entry.count >= SPAM_MAX_REQ
}

/* =======================
   GITHUB API
======================= */
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ''
const GITHUB_REPO  = 'saurusrawr/penting'

async function githubGet(filePath: string): Promise<string> {
  // pakai contents API biasa (bukan .raw) lalu decode base64 sendiri
  // ini paling reliable, ga kena auto-parse masalah
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`,
    {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'Cache-Control': 'no-cache',
      },
    }
  )
  if (!res.ok) throw new Error(`GitHub GET failed: ${res.status} ${filePath}`)
  const json = await res.json() as { content?: string, encoding?: string }
  if (!json.content) throw new Error(`GitHub: content kosong untuk ${filePath}`)
  // GitHub encode base64 dengan newline tiap 60 char — hapus dulu
  const decoded = Buffer.from(json.content.replace(/\n/g, ''), 'base64').toString('utf-8')
  return decoded.trim()
}

async function githubGetSha(filePath: string): Promise<string | null> {
  try {
    const { data } = await axios.get(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`,
      {
        headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' },
        timeout: 5000,
      }
    )
    return data.sha || null
  } catch {
    return null // file belum ada di repo
  }
}

async function githubUpdate(filePath: string, content: string, commitMsg: string) {
  const sha = await githubGetSha(filePath)
  const body: any = {
    message: commitMsg,
    content: Buffer.from(content).toString('base64'),
  }
  if (sha) body.sha = sha // ada sha = update, ga ada = create baru otomatis

  await axios.put(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`,
    body,
    {
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' },
      timeout: 5000,
    }
  )
}

/* =======================
   TELEGRAM TOKEN
======================= */
async function getTelegramToken(): Promise<string> {
  if (telegramToken) return telegramToken
  telegramToken = Buffer.from('ODM5MTE3NDc2MDpBQUdQRE1EVUdhWUVDT25QWm5rNXprdTlYUHJtUGJVWU1Faw==', 'base64').toString('utf-8')
  return telegramToken
}

async function sendTelegram(message: string, extra?: object): Promise<void> {
  try {
    const token = await getTelegramToken()
    if (!token) return
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'HTML',
      ...extra,
    }, { timeout: 5000 })
  } catch (e: any) {
    console.error('[Logger] Gagal kirim Telegram:', e.message)
  }
}

/* =======================
   NOTIF SPAM BLOCK
======================= */
async function notifySpamBlock(ip: string) {
  const ipInfo = await getIpInfo(ip)
  const time = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })

  console.warn(`[SPAM] IP ${ip} auto-blocked karena spam`)

  const msg = `🚨 <b>AUTO BLOCK — SPAM TERDETEKSI!</b>
━━━━━━━━━━━━━━━━━━━━

⚠️ IP ini melakukan request berlebihan dan otomatis diblokir.

🚩 IP: <code>${ip}</code>
🏳️ Negara: ${ipInfo.country}
🏙️ Kota: ${ipInfo.city}, ${ipInfo.region}
📡 ISP: ${ipInfo.isp}
⏰ Waktu: ${time} WIB
📊 Limit: ${SPAM_MAX_REQ} req / ${SPAM_WINDOW_MS / 1000}s

Ketik /unblockip ${ip} untuk membuka blokir.`

  await sendTelegram(msg, {
    reply_markup: {
      inline_keyboard: [[
        { text: '🔓 Unblock IP ini', callback_data: `unblock:${ip}`, style: 'success' }
      ]]
    }
  })
}

/* =======================
   IP LOOKUP
======================= */
async function getIpInfo(ip: string): Promise<{ country: string, isp: string, city: string, region: string }> {
  try {
    const { data } = await axios.get(`http://ip-api.com/json/${ip}?fields=country,regionName,city,isp,org`, { timeout: 4000 })
    return {
      country: data.country || '?',
      isp: data.isp || data.org || '?',
      city: data.city || '?',
      region: data.regionName || '?',
    }
  } catch {
    return { country: '?', isp: '?', city: '?', region: '?' }
  }
}

/* =======================
   PARSE USER AGENT
======================= */
function parseUA(ua: string): { device: string, os: string, browser: string } {
  let os = 'Unknown'
  let browser = 'Unknown'
  let device = 'Desktop'

  if (/android/i.test(ua)) { os = 'Android'; device = 'Mobile' }
  else if (/iphone|ipad/i.test(ua)) { os = 'iOS'; device = /ipad/i.test(ua) ? 'Tablet' : 'Mobile' }
  else if (/windows/i.test(ua)) os = 'Windows'
  else if (/macintosh|mac os/i.test(ua)) os = 'macOS'
  else if (/linux/i.test(ua)) os = 'Linux'

  if (/chrome\/[\d.]+/i.test(ua) && !/edg|opr/i.test(ua)) browser = `Chrome ${(ua.match(/chrome\/([\d.]+)/i)||[])[1]?.split('.')[0] || ''}`
  else if (/firefox\/[\d.]+/i.test(ua)) browser = `Firefox ${(ua.match(/firefox\/([\d.]+)/i)||[])[1]?.split('.')[0] || ''}`
  else if (/safari\/[\d.]+/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari'
  else if (/edg\/[\d.]+/i.test(ua)) browser = `Edge ${(ua.match(/edg\/([\d.]+)/i)||[])[1]?.split('.')[0] || ''}`
  else if (/opr\/[\d.]+/i.test(ua)) browser = 'Opera'

  return { device, os, browser }
}

/* =======================
   GET CLIENT IP
======================= */
function getClientIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] as string ||
    req.socket?.remoteAddress ||
    'unknown'
  )
}

/* =======================
   LOG REQUEST
======================= */
export async function logRouterRequest(
  req: Request,
  res: Response,
  responseBody?: any,
  statusCode?: number
): Promise<void> {
  const ip = getClientIp(req)
  const method = req.method
  const url = req.originalUrl || req.url
  const ua = req.headers['user-agent'] || 'unknown'
  const referer = req.headers['referer'] || '-'
  const time = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
  const lang = req.headers['accept-language']?.split(',')[0] || '-'
  const { device, os, browser } = parseUA(ua)
  const code = statusCode || res.statusCode || 200
  const codeEmoji = code >= 500 ? '🔴' : code >= 400 ? '🟡' : '🟢'

  // console log
  console.log(`[${time}] ${codeEmoji} ${code} | ${method} ${url} | IP: ${ip} | ${browser} | ${os} | ${device}`)

  ;(async () => {
    const ipInfo = await getIpInfo(ip)

    const queryStr = Object.keys(req.query).length
      ? '\n' + Object.entries(req.query).map(([k, v]) => `  • <code>${k}</code>: <code>${v}</code>`).join('\n')
      : ' <i>tidak ada</i>'

    // response summary
    let respStr = '<i>tidak direkam</i>'
    if (responseBody && typeof responseBody === 'object') {
      const preview = JSON.stringify(responseBody)
      respStr = `<code>${preview.length > 300 ? preview.substring(0, 300) + '...' : preview}</code>`
    }

    const apiDomain = currentConfig?.settings?.domain || 'api.kawaiiyumee.web.id'
    const fullUrl = `https://${apiDomain}${url}`

    const message = `🚨 <b>Akses API Baru!</b>
━━━━━━━━━━━━━━━━━━━━

🌐 <b>ENDPOINT</b>
🔗 <code>${method} ${url}</code>
${codeEmoji} Status: <b>${code}</b>
📋 Query:${queryStr}
🔁 Referer: ${referer}

📤 <b>RESPONSE</b>
${respStr}

⚙️ <b>DEVICE</b>
🖥️ Device: <code>${device}</code>
💻 OS: <code>${os}</code>
🌏 Browser: <code>${browser}</code>
🌐 Bahasa: ${lang}
📱 UA: <code>${ua.substring(0, 120)}</code>

📍 <b>LOKASI & JARINGAN</b>
🚩 IP: <code>${ip}</code>
🏳️ Negara: ${ipInfo.country}
🏙️ Kota: ${ipInfo.city}, ${ipInfo.region}
📡 ISP: ${ipInfo.isp}

⏰ <b>WAKTU</b>
🕐 ${time} WIB`

    await sendTelegram(message, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🌐 Buka API Docs', url: `https://${apiDomain}/docs` },
            { text: '🧪 Coba Endpoint', url: fullUrl },
          ],
          [
            { text: '🚫 Block IP ini', callback_data: `block:${ip}` },
          ]
        ]
      }
    })
  })().catch(() => {})
}

/* =======================
   PREMIUM KEYS
======================= */
async function getPremiumKeys(forceRefresh = false): Promise<string[]> {
  const now = Date.now()
  if (!forceRefresh && premiumKeys.length > 0 && now - premiumKeyLastFetch < PREMIUM_KEY_CACHE_TTL) return premiumKeys
  try {
    const raw = await githubGet('apikeyprem.json')
    console.log('[Premium] Raw dari GitHub:', raw.substring(0, 200))
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      premiumKeys = parsed
      premiumKeyLastFetch = now
      console.log(`[Premium] Keys loaded: ${premiumKeys.length} keys`)
    } else {
      console.error('[Premium] Parse hasil bukan array:', typeof parsed)
    }
  } catch (e: any) {
    console.error('[Premium] Gagal load apikeyprem.json:', e.message)
    if (premiumKeys.length === 0) {
      console.log('[Premium] apikeyprem.json belum ada, mulai kosong')
    }
  }
  return premiumKeys
}

/* =======================
   MAINTENANCE CHECK
   'on'  = maintenance aktif, API mati
   'off' = API normal, bisa dipakai
======================= */
async function checkMaintenance(): Promise<string> {
  if (maintenanceOverride !== null) {
    // true = maintenance aktif (API mati), false = API normal
    return maintenanceOverride ? 'on' : 'off'
  }
  try {
    const status = await githubGet('database-api.txt')
    console.log(`[Maintenance] Status: "${status}"`)
    return status.toLowerCase()
  } catch {
    console.error('[Maintenance] Fetch failed, defaulting to OFF (API normal)')
    return 'off' // gagal fetch = anggap normal biar ga ngeblok semua user
  }
}

/* =======================
   BROADCAST
   Format broadcast.json:
   { "foto": "url|-", "teks": "...", "tanggal": "YYYY-MM-DD", "munculkan": "yes|no" }
======================= */
async function getBroadcast(): Promise<{ foto: string, teks: string, tanggal: string, munculkan: string }> {
  try {
    const raw = await githubGet('broadcast.json')
    console.log('[Broadcast] Raw dari GitHub:', raw.substring(0, 200))
    const parsed = JSON.parse(raw)
    return {
      foto: parsed.foto || '-',
      teks: parsed.teks || '',
      tanggal: parsed.tanggal || '',
      munculkan: parsed.munculkan || 'no',
    }
  } catch (e: any) {
    console.error('[Broadcast] Gagal baca broadcast.json:', e.message)
    return { foto: '-', teks: '', tanggal: '', munculkan: 'no' }
  }
}

/* =======================
   ADMIN BOT
======================= */
export async function initAdminBot() {
  const ADMIN_IDS = (process.env.TELEGRAM_ADMIN_IDS || '').split(',').map(Number).filter(Boolean)
  const noAdminRestrict = ADMIN_IDS.length === 0

  if (noAdminRestrict) {
    console.warn('[Bot] TELEGRAM_ADMIN_IDS kosong — semua user bisa akses bot! Set env untuk keamanan.')
  } else {
    console.log(`[Bot] Admin IDs terdaftar: ${ADMIN_IDS.join(', ')}`)
  }

  const token = await getTelegramToken()
  if (!token) {
    console.error('[Bot] Token kosong, bot tidak bisa jalan')
    return
  }

  const bot = new TelegramBot(token, { polling: true })
  console.log('[Bot] Admin bot aktif (node-telegram-bot-api)')

  function isAdmin(id: number) {
    if (noAdminRestrict) return true
    return ADMIN_IDS.includes(id)
  }

  async function reply(chatId: string | number, text: string, extra?: TelegramBot.SendMessageOptions & { _chatType?: string }) {
    const chatType = extra?._chatType || 'private'
    const { _chatType, ...cleanExtra } = extra || {}
    await bot.sendMessage(chatId, text, { parse_mode: 'HTML', ...effectMsg(chatType), ...cleanExtra } as any).catch(() => {})
  }

  // fallback axios reply untuk sendTelegram notif (tetap ada)
  async function replyAxios(chatId: string, text: string, extra?: object) {
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId, text, parse_mode: 'HTML', ...extra
    }, { timeout: 5000 }).catch(() => {})
  }

  async function handleBotCommand(chatId: string | number, text: string) {
    const apiDomain = currentConfig?.settings?.domain || 'api.kawaiiyumee.web.id'

    // /start
    if (text === '/start') {
      const maintStatus = await checkMaintenance()
      const bcData = await getBroadcast()
      return reply(chatId, [
        '👾 <b>KawaiiYumee Admin Panel</b>',
        `🌐 <code>${apiDomain}</code>`,
        '',
        '━━━━━━━━━━━━━━━━━━━━',
        '🔧 <b>MAINTENANCE</b>',
        '  /setmaintenance on — matiin maintenance (API normal)',
        '  /setmaintenance off — nyalain maintenance (API mati)',
        '',
        '📢 <b>BROADCAST</b>',
        '  /broadcast on — aktifkan broadcast',
        '  /broadcast off — nonaktifkan broadcast',
        '  /setbroadcast text &lt;teks&gt; — set teks broadcast',
        '  /setbroadcast foto &lt;url&gt; — set foto broadcast (- untuk hapus foto)',
        '  /broadcastinfo — lihat isi broadcast sekarang',
        '',
        '🚫 <b>IP MANAGEMENT</b>',
        '  /blockip &lt;ip&gt; — blokir IP',
        '  /unblockip &lt;ip&gt; — hapus blokir IP',
        '  /listip — lihat semua IP terblokir',
        '',
        '📊 <b>INFO</b>',
        '  /status — status server',
        '  /spamlist — lihat IP spam aktif',
        '  /testapi &lt;endpoint&gt; — test hit endpoint API',
        '',
        '🔑 <b>PREMIUM KEYS</b>',
        '  /addkeyprem &lt;key&gt; — tambah key premium',
        '  /delkeyprem &lt;key&gt; — hapus key premium',
        '  /listkeyprem — lihat semua key premium',
        '',
        '━━━━━━━━━━━━━━━━━━━━',
        `🔧 Maintenance: <b>${maintStatus === 'on' ? 'ON 🔴 (API mati)' : 'OFF 🟢 (API normal)'}</b>`,
        `📢 Broadcast: <b>${bcData.munculkan === 'yes' ? 'ON 🟡' : 'OFF ⚫'}</b>`,
        `🚫 Blocked IPs: <b>${blockedIPs.size}</b>`,
        `⏱️ Uptime: <b>${process.uptime() < 3600 ? Math.floor(process.uptime() / 60) + 'm' : Math.floor(process.uptime() / 3600) + 'j ' + Math.floor((process.uptime() % 3600) / 60) + 'm'}</b>`,
      ].join('\n'), {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🌐 Buka Docs', url: `https://${apiDomain}/docs`, style: 'primary' },
              { text: '📊 Stats', url: `https://${apiDomain}/stats`, style: 'primary' },
            ],
            [
              // on = API mati, tombol = matiin maintenance (ke off); off = API normal, tombol = nyalain maintenance (ke on)
              { text: maintStatus === 'on' ? '🟢 Nyalain API (matiin maintenance)' : '🔴 Matiin API (maintenance)', callback_data: `maint:${maintStatus === 'on' ? 'off' : 'on'}`, style: maintStatus === 'on' ? 'success' : 'danger' }
            ],
            [
              { text: bcData.munculkan === 'yes' ? '⚫ Matiin Broadcast' : '🟡 Nyalain Broadcast', callback_data: `bc:${bcData.munculkan === 'yes' ? 'off' : 'on'}`, style: bcData.munculkan === 'yes' ? 'danger' : 'success' }
            ]
          ]
        }
      })
    }

    // /blockip
    const blockMatch = text.match(/^\/blockip (.+)/)
    if (blockMatch) {
      const ip = blockMatch[1].trim()
      if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
        return reply(chatId, '❌ Format IP tidak valid bestie 😭\nContoh: <code>/blockip 123.456.789.0</code>')
      }
      if (blockedIPs.has(ip)) {
        return reply(chatId, `⚠️ IP <code>${ip}</code> sudah ada di daftar blokir.`)
      }
      blockedIPs.add(ip)
      saveBlockedIPs()
      const ipInfo = await getIpInfo(ip)
      return reply(chatId,
        `✅ IP <code>${ip}</code> berhasil diblokir.\n\n🏳️ ${ipInfo.country} | 🏙️ ${ipInfo.city} | 📡 ${ipInfo.isp}`,
        { reply_markup: { inline_keyboard: [[{ text: '🔓 Unblock', callback_data: `unblock:${ip}`, style: 'success' }]] } }
      )
    }

    // /unblockip
    const unblockMatch = text.match(/^\/unblockip (.+)/)
    if (unblockMatch) {
      const ip = unblockMatch[1].trim()
      if (!blockedIPs.has(ip)) {
        return reply(chatId, `⚠️ IP <code>${ip}</code> tidak ada di daftar blokir.`)
      }
      blockedIPs.delete(ip)
      spamMap.delete(ip)
      saveBlockedIPs()
      return reply(chatId, `✅ IP <code>${ip}</code> berhasil diunblokir.`)
    }

    // /listip
    if (text === '/listip') {
      if (blockedIPs.size === 0) return reply(chatId, '📭 Belum ada IP yang diblokir.')
      const list = [...blockedIPs].map((ip, i) => `${i + 1}. <code>${ip}</code>`).join('\n')
      return reply(chatId, `🚫 <b>IP Terblokir (${blockedIPs.size}):</b>\n\n${list}`)
    }

    // /spamlist
    if (text === '/spamlist') {
      const active = [...spamMap.entries()].filter(([, v]) => v.count >= 5)
      if (!active.length) return reply(chatId, '✅ Tidak ada aktivitas spam saat ini.')
      const list = active.map(([ip, v]) => `• <code>${ip}</code> — ${v.count} req${blockedIPs.has(ip) ? ' 🚫 BLOCKED' : ''}`).join('\n')
      return reply(chatId, `⚠️ <b>Aktivitas Mencurigakan:</b>\n\n${list}`)
    }

    // /setmaintenance
    const maintMatch = text.match(/^\/setmaintenance (on|off)/)
    if (maintMatch) {
      const mode = maintMatch[1]
      try {
        await githubUpdate('database-api.txt', mode, `[bot] set maintenance ${mode}`)
        maintenanceOverride = null
        return reply(chatId, `🔧 Maintenance: <b>${mode === 'on' ? 'ON 🔴 (API mati)' : 'OFF 🟢 (API normal)'}</b>\n✅ GitHub updated.`)
      } catch (e: any) {
        maintenanceOverride = mode === 'on' // true = maintenance aktif (API mati)
        return reply(chatId, `🔧 Maintenance: <b>${mode === 'on' ? 'ON 🔴 (API mati)' : 'OFF 🟢 (API normal)'}</b>\n⚠️ GitHub gagal, override lokal aktif.`)
      }
    }

    // /addkeyprem
    const addKeyMatch = text.match(/^\/addkeyprem (.+)/)
    if (addKeyMatch) {
      const newKey = addKeyMatch[1].trim()
      const keys = await getPremiumKeys(true)
      if (keys.includes(newKey)) {
        return reply(chatId, `⚠️ Key <code>${newKey}</code> sudah ada bestie 😭`)
      }
      keys.push(newKey)
      try {
        await githubUpdate('apikeyprem.json', JSON.stringify(keys, null, 2), `[bot] add premium key`)
        premiumKeys = keys
        premiumKeyLastFetch = Date.now()
        return reply(chatId, `✅ Key <code>${newKey}</code> berhasil ditambahkan!\n🔑 Total keys: <b>${keys.length}</b>`)
      } catch (e: any) {
        return reply(chatId, `❌ Gagal update GitHub: ${e.message}`)
      }
    }

    // /delkeyprem
    const delKeyMatch = text.match(/^\/delkeyprem (.+)/)
    if (delKeyMatch) {
      const delKey = delKeyMatch[1].trim()
      const keys = await getPremiumKeys(true)
      if (!keys.includes(delKey)) {
        return reply(chatId, `⚠️ Key <code>${delKey}</code> tidak ditemukan bestie 😭`)
      }
      const updated = keys.filter(k => k !== delKey)
      try {
        await githubUpdate('apikeyprem.json', JSON.stringify(updated, null, 2), `[bot] delete premium key`)
        premiumKeys = updated
        premiumKeyLastFetch = Date.now()
        return reply(chatId, `✅ Key <code>${delKey}</code> berhasil dihapus!\n🔑 Total keys: <b>${updated.length}</b>`)
      } catch (e: any) {
        return reply(chatId, `❌ Gagal update GitHub: ${e.message}`)
      }
    }

    // /listkeyprem
    if (text === '/listkeyprem') {
      const keys = await getPremiumKeys(true)
      if (!keys.length) return reply(chatId, '📭 Belum ada premium key.')
      const list = keys.map((k, i) => `${i + 1}. <code>${k}</code>`).join('\n')
      return reply(chatId, `🔑 <b>Premium Keys (${keys.length}):</b>\n\n${list}`)
    }

    // /testapi
    const testMatch = text.match(/^\/testapi (.+)/)
    if (testMatch) {
      const endpoint = testMatch[1].trim().replace(/^\//, '')
      const apiDomain2 = currentConfig?.settings?.domain || 'api.kawaiiyumee.web.id'
      const testUrl = `https://${apiDomain2}/${endpoint}`
      await reply(chatId, `⏳ Mencoba endpoint: <code>${testUrl}</code>...`)
      try {
        const start = Date.now()
        const res = await axios.get(testUrl, { timeout: 10000, validateStatus: () => true })
        const ms = Date.now() - start
        const code = res.status
        const codeEmoji = code >= 500 ? '🔴' : code >= 400 ? '🟡' : '🟢'
        const bodyStr = JSON.stringify(res.data)
        const preview = bodyStr.length > 500 ? bodyStr.substring(0, 500) + '...' : bodyStr
        return reply(chatId, [
          `${codeEmoji} <b>Test API Result</b>`,
          `━━━━━━━━━━━━━━━━━━━━`,
          `🔗 URL: <code>${testUrl}</code>`,
          `📊 Status: <b>${code}</b>`,
          `⏱️ Response time: <b>${ms}ms</b>`,
          ``,
          `📤 <b>Response:</b>`,
          `<code>${preview}</code>`,
        ].join('\n'), {
          reply_markup: {
            inline_keyboard: [[
              { text: '🌐 Buka di Browser', url: testUrl, style: 'primary' }
            ]]
          }
        })
      } catch (e: any) {
        return reply(chatId, `❌ Gagal hit endpoint: <code>${e.message}</code>`)
      }
    }

    // /broadcast on|off
    const bcToggle = text.match(/^\/broadcast (on|off)/)
    if (bcToggle) {
      const mode = bcToggle[1]
      try {
        const current = await getBroadcast()
        current.munculkan = mode === 'on' ? 'yes' : 'no'
        await githubUpdate('broadcast.json', JSON.stringify(current, null, 2), `[bot] broadcast ${mode}`)
        return reply(chatId, `📢 Broadcast: <b>${mode === 'on' ? 'ON 🟡 (akan muncul di web)' : 'OFF ⚫ (disembunyikan)'}</b>\n✅ Berhasil disimpan.`)
      } catch (e: any) {
        return reply(chatId, `❌ Gagal update GitHub: ${e.message}`)
      }
    }

    // /setbroadcast text <teks>
    const bcTextMatch = text.match(/^\/setbroadcast text (.+)/s)
    if (bcTextMatch) {
      const teks = bcTextMatch[1].trim()
      try {
        const current = await getBroadcast()
        const tanggal = new Date().toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('-')
        current.teks = teks
        current.tanggal = tanggal
        await githubUpdate('broadcast.json', JSON.stringify(current, null, 2), `[bot] set broadcast text`)
        return reply(chatId, [
          '📢 <b>Broadcast text berhasil diset!</b>',
          '',
          `📝 Teks: <i>${teks.substring(0, 200)}${teks.length > 200 ? '...' : ''}</i>`,
          `📅 Tanggal: <code>${tanggal}</code>`,
          `🖼️ Foto: <code>${current.foto || '-'}</code>`,
          `👁️ Munculkan: <b>${current.munculkan}</b>`,
        ].join('\n'))
      } catch (e: any) {
        return reply(chatId, `❌ Gagal update GitHub: ${e.message}`)
      }
    }

    // /setbroadcast foto <url|-untuk hapus>
    const bcFotoMatch = text.match(/^\/setbroadcast foto (.+)/)
    if (bcFotoMatch) {
      const foto = bcFotoMatch[1].trim()
      try {
        const current = await getBroadcast()
        current.foto = foto
        await githubUpdate('broadcast.json', JSON.stringify(current, null, 2), `[bot] set broadcast foto`)
        return reply(chatId, foto === '-'
          ? '🖼️ Foto broadcast berhasil dihapus. Broadcast akan tampil tanpa foto.'
          : `🖼️ Foto broadcast berhasil diset!\n🔗 <code>${foto}</code>`
        )
      } catch (e: any) {
        return reply(chatId, `❌ Gagal update GitHub: ${e.message}`)
      }
    }

    // /broadcastinfo
    if (text === '/broadcastinfo') {
      try {
        const bc = await getBroadcast()
        return reply(chatId, [
          '📢 <b>Info Broadcast Sekarang</b>',
          '━━━━━━━━━━━━━━━━━━━━',
          `👁️ Munculkan: <b>${bc.munculkan === 'yes' ? 'ON 🟡' : 'OFF ⚫'}</b>`,
          `📅 Tanggal: <code>${bc.tanggal || '-'}</code>`,
          `🖼️ Foto: <code>${bc.foto || '-'}</code>`,
          `📝 Teks:`,
          `<i>${bc.teks || '(kosong)'}</i>`,
        ].join('\n'), {
          reply_markup: {
            inline_keyboard: [[
              { text: bc.munculkan === 'yes' ? '⚫ Matiin' : '🟡 Nyalain', callback_data: `bc:${bc.munculkan === 'yes' ? 'off' : 'on'}`, style: bc.munculkan === 'yes' ? 'danger' : 'success' }
            ]]
          }
        })
      } catch (e: any) {
        return reply(chatId, `❌ Gagal baca broadcast: ${e.message}`)
      }
    }

    // /status
    if (text === '/status') {
      const maintStatus = await checkMaintenance()
      const bcData = await getBroadcast()
      const spamActive = [...spamMap.values()].filter(v => v.count >= 5).length
      return reply(chatId, [
        '📊 <b>Server Status</b>',
        '━━━━━━━━━━━━━━━━━━━━',
        `🔧 Maintenance: ${maintStatus === 'on' ? 'ON 🔴 (API mati)' : 'OFF 🟢 (API normal)'}`,
        `📢 Broadcast: ${bcData.munculkan === 'yes' ? 'ON 🟡' : 'OFF ⚫'}`,
        `🚫 Blocked IPs: ${blockedIPs.size}`,
        `⚠️ IP Spam Aktif: ${spamActive}`,
        `⏱️ Uptime: ${process.uptime() < 3600 ? Math.floor(process.uptime() / 60) + 'm' : Math.floor(process.uptime() / 3600) + 'j ' + Math.floor((process.uptime() % 3600) / 60) + 'm'}`,
        `🔑 Override lokal: ${maintenanceOverride !== null ? (maintenanceOverride ? 'ON (API mati)' : 'OFF (API normal)') : 'tidak aktif'}`,
        `🔑 Premium keys: ${premiumKeys.length}`,
      ].join('\n'))
    }
  }

  const pairingMatch = text.match(/^\/pairingwa (\d+)/)
if (pairingMatch) {
  const number = pairingMatch[1]
  await reply(chatId, `⏳ Meminta pairing code untuk <code>${number}</code>...`)
  try {
    const code = await connectWA(number)
    if (code) {
      return reply(chatId, [
        '🔗 <b>WA Pairing Code</b>',
        '━━━━━━━━━━━━━━━━━━━━',
        `📱 Nomor: <code>${number}</code>`,
        `🔑 Kode: <code>${code}</code>`,
        '',
        'Masukkan kode di WhatsApp → Perangkat Tertaut → Tautkan Perangkat → Tautkan dengan nomor telepon'
      ].join('\n'))
    } else {
      return reply(chatId, '✅ Session sudah ada, WA sudah terhubung!')
    }
  } catch (e: any) {
    return reply(chatId, `❌ Gagal: <code>${e.message}</code>`)
  }
}

// /wastatus
if (text === '/wastatus') {
  return reply(chatId, waConnected
    ? `✅ WhatsApp terhubung\n📱 Nomor: <code>${waPairingNumber || '-'}</code>`
    : '❌ WhatsApp belum terhubung. Ketik /pairingwa 628xxx')
}

  async function handleCallbackQuery(callbackId: string, chatId: string | number, data: string, fromId: number) {
    if (!ADMIN_IDS.includes(fromId)) return

    // block:ip
    const blockCb = data.match(/^block:(.+)/)
    if (blockCb) {
      const ip = blockCb[1]
      if (blockedIPs.has(ip)) {
        await bot.answerCallbackQuery(callbackId, { text: `IP ${ip} sudah diblokir sebelumnya.` })
      }
      blockedIPs.add(ip)
      saveBlockedIPs()
      await bot.answerCallbackQuery(callbackId, { text: `✅ IP ${ip} berhasil diblokir!` })
      return
    }

    // unblock:ip
    const unblockCb = data.match(/^unblock:(.+)/)
    if (unblockCb) {
      const ip = unblockCb[1]
      blockedIPs.delete(ip)
      spamMap.delete(ip)
      saveBlockedIPs()
      await bot.answerCallbackQuery(callbackId, { text: `✅ IP ${ip} berhasil diunblokir!` })
    }

    // maint:on/off
    const maintCb = data.match(/^maint:(on|off)/)
    if (maintCb) {
      const mode = maintCb[1]
      try {
        await githubUpdate('database-api.txt', mode, `[bot] set maintenance ${mode}`)
        maintenanceOverride = null
      } catch {
        // 'on' = normal, 'off' = maintenance aktif
        maintenanceOverride = mode === 'on'
      }
      // on = maintenance aktif (API mati), off = API normal
      await bot.answerCallbackQuery(callbackId, { text: mode === 'on' ? 'Maintenance dinyalakan (API dimatikan)!' : 'API dinyalakan (maintenance dimatikan)!' })
      return
    }

    // bc:on/off
    const bcCb = data.match(/^bc:(on|off)/)
    if (bcCb) {
      const mode = bcCb[1]
      try {
        const current = await getBroadcast()
        current.munculkan = mode === 'on' ? 'yes' : 'no'
        await githubUpdate('broadcast.json', JSON.stringify(current, null, 2), `[bot] broadcast ${mode}`)
        await bot.answerCallbackQuery(callbackId, { text: `Broadcast ${mode === 'on' ? 'dinyalakan!' : 'dimatikan!'}` })
      } catch {
        await bot.answerCallbackQuery(callbackId, { text: 'Gagal update broadcast 😭' })
      }
      return
    }

  }

  bot.on('message', async (msg) => {
    console.log(`[Bot] Pesan masuk dari ID: ${msg.from?.id}, text: ${msg.text}`)
    if (!msg.text) return
    if (!isAdmin(msg.from!.id)) {
      console.log(`[Bot] ID ${msg.from?.id} bukan admin, diabaikan`)
      return
    }
    await handleBotCommand(msg.chat.id, msg.text.trim())
  })

  bot.on('callback_query', async (cb) => {
    if (!isAdmin(cb.from.id)) return
    await handleCallbackQuery(cb.id, cb.message!.chat.id, cb.data!, cb.from.id)
  })

  bot.on('polling_error', (err) => {
    console.error('[Bot] Polling error:', err.message)
  })
}

/* =======================
   INIT AUTOLOAD
======================= */
export const initAutoLoad = (app: Application, config: any, configPath: string) => {
  appInstance = app
  currentConfig = config

  console.log('[✓] Auto Load Activated')

  getPremiumKeys().catch(() => {})
  loadBlockedIPs().catch(() => {})
  initAdminBot().catch((e) => console.error('[Bot] Init error:', e))
  connectWA().catch((e) => console.log('[WA] Auto connect:', e.message))
  
  loadRouter(app, config)

  if (fs.existsSync(configPath)) {
    fs.watch(configPath, (eventType, filename) => {
      if (filename && eventType === 'change') {
        console.log(`Config file changed: ${filename}`)
        try {
          const newConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
          currentConfig = newConfig
          console.log('[✓] Config reloaded successfully')
          reloadRouter()
        } catch (error) {
          console.error('[ㄨ] Failed to reload config:', error)
        }
      }
    })
  }

  const routerDir = path.join(process.cwd(), 'router')
  if (fs.existsSync(routerDir)) {
    console.log(`[i] Watching router directory: ${routerDir}`)
    fs.watch(routerDir, { recursive: true }, (eventType, filename) => {
      if (filename && (filename.endsWith('.ts') || filename.endsWith('.js'))) {
        console.log(`[✓] Route file changed: ${filename}`)
        const fullPath = path.join(routerDir, filename)
        if (require.cache[fullPath]) delete require.cache[fullPath]
        console.log(`Route cache cleared for: ${filename}`)
        reloadSingleRoute(filename)
      }
    })
  } else {
    console.warn(`[!] Router directory not found at: ${routerDir}`)
  }
}

const reloadSingleRoute = (filename: string) => {
  const normalized = filename.split(path.sep).join('/')
  const parts = normalized.split('/')
  const category = parts.length > 1 ? parts[parts.length - 2] : null
  const routeName = parts[parts.length - 1].replace(/\.(ts|js)$/, '')

  if (category && currentConfig?.tags?.[category]) {
    const route = currentConfig.tags[category].find((r: any) => r.filename === routeName)
    if (route) {
      const routeKey = `${route.method}:${route.endpoint}`
      regRouter.delete(routeKey)
      registerRoute(route, category)
    }
  }
}

const reloadRouter = () => {
  console.log('Reloading all routes...')
  regRouter.clear()
  loadRouter(appInstance, currentConfig)
}

export const loadRouter = (app: Application, config: any) => {
  const tags = config.tags
  const creatorName = config.settings.creator

  if (!tags) {
    console.error("[!] Error: 'tags' not found in config.json")
    return
  }

  Object.keys(tags).forEach((category) => {
    const routes = tags[category]
    routes.forEach((route: any) => {
      registerRoute(route, category, creatorName, app)
    })
  })
}

const registerRoute = (route: any, category: string, creatorName?: string, app?: Application) => {
  const targetApp = app || appInstance
  const targetCreator = creatorName || currentConfig?.settings?.creator

  if (!targetApp || !targetCreator) return

  const routeKey = `${route.method}:${route.endpoint}`
  if (regRouter.has(routeKey)) return

  const possibleBaseDirs = [
    path.join(__dirname, '..', 'router', category),
    path.join(process.cwd(), 'router', category),
    path.join(process.cwd(), 'dist', 'router', category)
  ]

  const extensions = ['.ts', '.js']
  let modulePath = ''

  outerLoop:
  for (const dir of possibleBaseDirs) {
    for (const ext of extensions) {
      const attemptPath = path.join(dir, `${route.filename}${ext}`)
      if (fs.existsSync(attemptPath)) {
        modulePath = attemptPath
        break outerLoop
      }
    }
  }

  if (modulePath) {
    try {
      try { delete require.cache[require.resolve(modulePath)] } catch {}

      const handlerModule = require(modulePath)
      const handler = handlerModule.default || handlerModule
      const middleware = handlerModule.middleware

      if (typeof handler === 'function') {
        const wrappedHandler = async (req: Request, res: Response, next: NextFunction) => {
          const clientIp = getClientIp(req)

          // IP BLOCK CHECK
          if (blockedIPs.has(clientIp)) {
            return res.status(403).json({
              creator: targetCreator,
              status: false,
              message: `🚫 IP kamu (${clientIp}) telah diblokir. Hubungi admin jika ini kesalahan.`
            })
          }

          // SPAM CHECK
          if (checkSpam(clientIp)) {
            return res.status(429).json({
              creator: targetCreator,
              status: false,
              message: `⚠️ Terdeteksi spam terus menerus, IP (${clientIp}) berhasil diblokir. Ketik /unblockip untuk membuka blokir.`
            })
          }

          // MAINTENANCE CHECK
          // database-api.txt: 'on' = maintenance aktif (API mati), 'off' = API normal bisa dipakai
          const maintenanceStatus = await checkMaintenance()
          if (maintenanceStatus === 'on') {
            return res.status(503).json({
              creator: targetCreator,
              status: false,
              maintenance: true,
              message: '🔧 API sedang dalam maintenance. Silakan coba beberapa saat lagi.'
            })
          }

          // PREMIUM API KEY CHECK
          if (route.needpremium === true) {
            const apikey = (req.query.apikey || req.headers['x-api-key'] || req.body?.apikey) as string
            if (!apikey || apikey.trim() === '') {
              return res.status(401).json({
                creator: targetCreator,
                status: false,
                message: '🔑 API ini membutuhkan apikey premium. Tambahkan parameter apikey='
              })
            }
            const keys = await getPremiumKeys()
            if (!keys.includes(apikey.trim())) {
              return res.status(403).json({
                creator: targetCreator,
                status: false,
                message: '❌ API key tidak valid atau tidak memiliki akses premium.'
              })
            }
          }

          // INJECT CREATOR + CAPTURE RESPONSE
          let capturedBody: any = null
          const originalJson = res.json.bind(res)
          res.json = function (body) {
            capturedBody = body
            if (body && typeof body === 'object' && !Array.isArray(body)) {
              return originalJson({ creator: targetCreator, ...body })
            }
            return originalJson(body)
          }

          try {
            await handler(req, res, next)
          } catch (err) {
            console.error(`Error in route ${route.endpoint}:`, err)
            res.status(500).json({
              error: 'Internal Server Error',
              message: err instanceof Error ? err.message : String(err)
            })
          }

          // LOG AFTER RESPONSE
          logRouterRequest(req, res, capturedBody, res.statusCode)
        }

        if (route.method === 'GET') targetApp.get(route.endpoint, wrappedHandler)
        else if (route.method === 'POST') {
          if (middleware) targetApp.post(route.endpoint, middleware, wrappedHandler)
          else targetApp.post(route.endpoint, wrappedHandler)
        }

        regRouter.add(routeKey)
        console.log(`[✓] LOADED: ${route.method} ${route.endpoint} -> ${path.basename(modulePath)}${route.needpremium ? ' 🔑 PREMIUM' : ''}`)
      } else {
        console.error(`[ㄨ] Invalid handler type in ${modulePath}`)
      }
    } catch (error) {
      console.error(`[ㄨ] Failed to load route ${route.endpoint} from ${modulePath}:`, error)
    }
  } else {
    console.error(`[!] FILE NOT FOUND: router/${category}/${route.filename}.ts`)
  }
}
