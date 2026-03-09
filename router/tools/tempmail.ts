import { Request, Response } from "express"
import axios from "axios"

const BASE = "https://www.emailnator.com"

async function getSession() {
  const res = await axios.get(BASE, {
    headers: {
      "user-agent": "Mozilla/5.0",
      "accept": "application/json, text/plain, */*",
      "referer": BASE + "/",
    },
    withCredentials: true,
  })

  const rawCookies: string[] = res.headers["set-cookie"] || []
  if (!rawCookies.length) throw new Error("Session cookie not found")

  const cookies = rawCookies.map((v: string) => v.split(";")[0]).join("; ")
  const match = cookies.match(/XSRF-TOKEN=([^;]+)/)
  if (!match) throw new Error("XSRF token not found")

  return { cookies, xsrf: decodeURIComponent(match[1]) }
}

function authHeaders(session: { cookies: string; xsrf: string }) {
  return {
    cookie: session.cookies,
    "x-xsrf-token": session.xsrf,
    "x-requested-with": "XMLHttpRequest",
    "content-type": "application/json",
    "user-agent": "Mozilla/5.0",
    referer: BASE + "/",
  }
}

function cleanHTML(html: string): string {
  let bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  let clean = bodyMatch ? bodyMatch[1] : html
  return clean
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&#\d+;/g, "")
    .replace(/\uFEFF/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&zwnj;/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\r?\n|\r/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
}

function extractOTP(text: string): string | null {
  const match = text.match(/(code|otp|verify|verification|login|password)[^0-9]{0,20}(\d{4,6})/i)
  return match ? match[2] : null
}

async function createEmail(): Promise<string> {
  const session = await getSession()
  const res = await axios.post(
    BASE + "/generate-email",
    { email: ["plusGmail", "dotGmail", "googleMail"] },
    { headers: authHeaders(session) }
  )
  const data = res.data
  if (!data?.email) throw new Error("Gagal membuat email sementara")
  return data.email
}

async function checkInbox(email: string) {
  const session = await getSession()

  const inboxRes = await axios.post(
    BASE + "/message-list",
    { email },
    { headers: authHeaders(session) }
  )

  const inbox: any[] = inboxRes.data?.messageData || []
  const mail = inbox.find((v: any) => v.messageID !== "ADSVPN")
  if (!mail) return null

  const openRes = await axios.post(
    BASE + "/message-list",
    { email, messageID: mail.messageID },
    { headers: authHeaders(session), responseType: "text" }
  )

  const clean = cleanHTML(openRes.data)
  const otp = extractOTP(clean)

  return {
    from: mail.from,
    subject: mail.subject,
    time: mail.time,
    otp,
    preview: clean.slice(0, 700),
  }
}

export default async function tempmailHandler(req: Request, res: Response) {
  const type = (req.query.type as string)?.toLowerCase()
  const email = req.query.email as string

  if (!type || !["create", "inbox"].includes(type)) {
    return res.status(400).json({
      status: false,
      message: "Parameter 'type' wajib diisi: create | inbox",
    })
  }

  if (type === "inbox" && !email) {
    return res.status(400).json({
      status: false,
      message: "Parameter 'email' wajib diisi untuk type inbox",
    })
  }

  try {
    if (type === "create") {
      const newEmail = await createEmail()
      return res.json({
        status: true,
        data: { email: newEmail },
      })
    }

    if (type === "inbox") {
      const result = await checkInbox(email)
      if (!result) {
        return res.json({
          status: false,
          message: "Inbox kosong atau belum ada pesan masuk",
        })
      }
      return res.json({
        status: true,
        data: result,
      })
    }
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message })
  }
}
