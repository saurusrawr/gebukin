/*
  WA Session Manager
  Import dan panggil initWA(githubGet, githubUpdate, sendTelegram) di initAutoLoad
*/

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

const WA_SESSION_PATH = path.join(os.tmpdir(), 'wa-session')
const WA_SESSION_GITHUB_PATH = 'wa-session.json'

export let waSocket: any = null
export let waConnected = false
export let waPairingNumber: string | null = null

// inject fungsi dari autoload.ts
type GithubGet = (filePath: string) => Promise<string>
type GithubUpdate = (filePath: string, content: string, msg: string) => Promise<void>
type SendTelegram = (msg: string) => Promise<void>

let _githubGet: GithubGet
let _githubUpdate: GithubUpdate
let _sendTelegram: SendTelegram

export function initWA(
  githubGet: GithubGet,
  githubUpdate: GithubUpdate,
  sendTelegram: SendTelegram
) {
  _githubGet = githubGet
  _githubUpdate = githubUpdate
  _sendTelegram = sendTelegram
}

async function saveSessionToGithub() {
  try {
    if (!fs.existsSync(WA_SESSION_PATH)) return
    const sessionFiles = fs.readdirSync(WA_SESSION_PATH)
    const sessionData: Record<string, string> = {}
    for (const file of sessionFiles) {
      sessionData[file] = fs.readFileSync(path.join(WA_SESSION_PATH, file), 'utf-8')
    }
    await _githubUpdate(WA_SESSION_GITHUB_PATH, JSON.stringify(sessionData, null, 2), '[bot] update wa session')
    console.log('[WA] Session disimpan ke GitHub')
  } catch (e: any) {
    console.error('[WA] Gagal simpan session:', e.message)
  }
}

async function loadSessionFromGithub(): Promise<boolean> {
  try {
    if (!fs.existsSync(WA_SESSION_PATH)) fs.mkdirSync(WA_SESSION_PATH, { recursive: true })
    const raw = await _githubGet(WA_SESSION_GITHUB_PATH)
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

export async function connectWA(phoneNumber?: string): Promise<string | null> {
  // kalo ada phoneNumber = pairing baru, hapus session lama dulu
  if (phoneNumber) {
    try {
      if (fs.existsSync(WA_SESSION_PATH)) {
        fs.rmSync(WA_SESSION_PATH, { recursive: true, force: true })
        console.log('[WA] Session lama dihapus untuk pairing baru')
      }
    } catch {}
  } else {
    await loadSessionFromGithub()
  }
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
    browser: ['kawaiiyumee', 'Safari', '3'],  // make by SaurusOfficiall
    syncFullHistory: false,
    logger: require('pino')({ level: 'silent' })
  })

  // minta pairing code kalo belum register
  if (!waSocket.authState.creds.registered && phoneNumber) {
    await new Promise(r => setTimeout(r, 5000))
    const formattedNumber = phoneNumber.replace(/[^0-9]/g, "")
    console.log(`[WA] Requesting pairing code for: ${formattedNumber}`)
    console.log(`[WA] Socket state:`, waSocket.authState?.creds?.registered)
    console.log(`[WA] WA version:`, version)
    const code = await waSocket.requestPairingCode(formattedNumber)
    waPairingNumber = phoneNumber
    console.log(`[WA] Pairing code ${formattedNumber}: ${code}`)
    await _sendTelegram(`[WA DEBUG] Nomor: ${formattedNumber}\nKode: ${code}\nRegistered: ${waSocket.authState?.creds?.registered}`)
    return code
  }

  waSocket.ev.on('connection.update', async (update: any) => {
    const { connection, lastDisconnect } = update
    if (connection === 'close') {
      waConnected = false
      const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
      if (shouldReconnect) setTimeout(() => connectWA(), 5000)
    } else if (connection === 'open') {
      waConnected = true
      console.log('[WA] Terhubung!')
      await _sendTelegram('✅ <b>WhatsApp kawaiiyumee terhubung!</b>')
    }
  })

  waSocket.ev.on('creds.update', async () => {
    await saveCreds()
    await saveSessionToGithub()
  })

  return null
}
