/*
  WA Session Manager
  Tambahkan import + registerWARoutes(app) + connectWA() di initAutoLoad
*/

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import * as os from 'os'
import * as path from 'path'

const WA_SESSION_PATH = path.join(os.tmpdir(), 'wa-session')
const WA_SESSION_GITHUB_PATH = 'wa-session.json'

let waSocket: any = null
let waConnected = false
let waPairingNumber: string | null = null

// ── simpan session ke github ──
async function saveSessionToGithub() {
  try {
    if (!fs.existsSync(WA_SESSION_PATH)) return
    const sessionFiles = fs.readdirSync(WA_SESSION_PATH)
    const sessionData: Record<string, string> = {}
    for (const file of sessionFiles) {
      sessionData[file] = fs.readFileSync(path.join(WA_SESSION_PATH, file), 'utf-8')
    }
    await githubUpdate(WA_SESSION_GITHUB_PATH, JSON.stringify(sessionData, null, 2), '[bot] update wa session')
    console.log('[WA] Session disimpan ke GitHub')
  } catch (e: any) {
    console.error('[WA] Gagal simpan session:', e.message)
  }
}

// ── load session dari github ──
async function loadSessionFromGithub(): Promise<boolean> {
  try {
    if (!fs.existsSync(WA_SESSION_PATH)) fs.mkdirSync(WA_SESSION_PATH, { recursive: true })
    const raw = await githubGet(WA_SESSION_GITHUB_PATH)
    const sessionData: Record<string, string> = JSON.parse(raw)
    for (const [filename, content] of Object.entries(sessionData)) {
      fs.writeFileSync(path.join(WA_SESSION_PATH, filename), content, 'utf-8')
    }
    console.log('[WA] Session dimuat dari GitHub')
    return true
  } catch {
    console.log('[WA] Belum ada session, perlu pairing')
    return false
  }
}

// ── connect wa ──
export async function connectWA(phoneNumber?: string): Promise<string | null> {
  await loadSessionFromGithub()
  if (!fs.existsSync(WA_SESSION_PATH)) fs.mkdirSync(WA_SESSION_PATH, { recursive: true })

  const { state, saveCreds } = await useMultiFileAuthState(WA_SESSION_PATH)
  const { version } = await fetchLatestBaileysVersion()

  waSocket = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, console as any)
    },
    printQRInTerminal: false,
    browser: ['KawaiiYumee', 'Chrome', '124.0.0'],
    syncFullHistory: false
  })

  // minta pairing code kalo belum register
  if (!waSocket.authState.creds.registered && phoneNumber) {
    await new Promise(r => setTimeout(r, 3000))
    const code = await waSocket.requestPairingCode(phoneNumber)
    waPairingNumber = phoneNumber
    console.log(`[WA] Pairing code ${phoneNumber}: ${code}`)
    return code
  }

  waSocket.ev.on('connection.update', async (update: any) => {
    const { connection, lastDisconnect } = update
    if (connection === 'close') {
      waConnected = false
      const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
      console.log('[WA] Koneksi putus, reconnect:', shouldReconnect)
      if (shouldReconnect) setTimeout(() => connectWA(), 5000)
    } else if (connection === 'open') {
      waConnected = true
      console.log('[WA] Terhubung!')
      await sendTelegram('✅ <b>WhatsApp kawaiiyumee terhubung!</b>')
    }
  })

  waSocket.ev.on('creds.update', async () => {
    await saveCreds()
    await saveSessionToGithub()
  })

  return null
}

export { waSocket, waConnected }
