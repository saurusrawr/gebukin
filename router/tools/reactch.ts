import { Request, Response } from "express"
import axios from "axios"

const BASE_URL = "https://yogaxd-react.web.id"
const VIP_KEY = "vip-liyaa111"

const uaList = [
  "Mozilla/5.0 (Linux; Android 10; SM-A205F)",
  "Mozilla/5.0 (Linux; Android 11; Redmi Note 9)",
  "Mozilla/5.0 (Linux; Android 12; Pixel 5)",
  "Mozilla/5.0 (Linux; Android 13; SM-S908B)",
  "Mozilla/5.0 (Linux; Android 14; Pixel 8)",
]

const timezones = ["Jakarta", "Singapore", "Bangkok", "Manila"]
const languages = ["id-ID", "en-US", "ms-MY"]
const platforms = ["Linux armv8", "Linux x86_64", "Android"]

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function createSession(ua: string) {
  const cookie = `session=${Math.random().toString(36).substring(2)}; visitor=${Date.now()}`
  return axios.create({
    baseURL: BASE_URL,
    headers: {
      "accept": "application/json",
      "user-agent": ua,
      "x-requested-with": "XMLHttpRequest",
      "referer": BASE_URL + "/vip",
      "origin": BASE_URL,
      "cookie": cookie,
    },
  })
}

async function reactVip(channel: string, emojis: string[]) {
  const ua = rand(uaList)
  const session = createSession(ua)

  const tokenReq = await session.get("/api/get-token")
  const token = tokenReq.data.token
  if (!token) throw new Error("Token tidak ditemukan")

  const submit = await session.post("/api/submit-vip", {
    postUrl: channel,
    reactions: emojis,
    vipKey: VIP_KEY,
  }, {
    headers: {
      "x-csrf-token": token,
      "content-type": "application/json",
    },
  })

  return submit.data
}

export default async function reactchHandler(req: Request, res: Response) {
  const channel = req.query.channel as string
  const emojiRaw = req.query.emoji as string

  if (!channel || !emojiRaw) {
    return res.status(400).json({ status: false, message: "Parameter 'channel' dan 'emoji' wajib diisi" })
  }

  const emojis = emojiRaw.includes(",")
    ? emojiRaw.split(",").map((e) => e.trim()).filter(Boolean)
    : [...(emojiRaw.match(/\p{Emoji}(\p{Emoji_Modifier}|\u200D\p{Emoji})*/gu) || [])]

  if (emojis.length === 0) {
    return res.status(400).json({ status: false, message: "Emoji tidak valid" })
  }

  if (emojis.length > 20) {
    return res.status(400).json({ status: false, message: "Maksimal 20 emoji" })
  }

  try {
    const data = await reactVip(channel, emojis)
    if (!data.success) {
      return res.status(400).json({ status: false, message: data.error || "Gagal mengirim reaction" })
    }
    res.json({ status: true, message: data.message, data })
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.response?.data?.error || error.message })
  }
}
