import { Request, Response } from "express"
import axios from "axios"

// ambil url web server langsung dari raw github, ga perlu token
const WEB_JSON_URL = 'https://raw.githubusercontent.com/saurusrawr/penting/main/web.json'

async function ambil_base_url(): Promise<string | null> {
  try {
    const { data } = await axios.get(WEB_JSON_URL, { timeout: 8000 })
    return data.webnya?.replace(/\/$/, '') || null
  } catch { return null }
}

export default async function cekidchHandler(req: Request, res: Response) {
  const input = String(req.query.url || req.query.id || '').trim()

  if (!input) {
    return res.status(400).json({
      status: false,
      message: "parameter 'url' wajib diisi, contoh: ?url=https://whatsapp.com/channel/xxx"
    })
  }

  try {
    const base_url = await ambil_base_url()
    if (!base_url) {
      return res.status(503).json({
        status: false,
        message: "web server belum aktif, ketik 'mulaiweb' di bot WA dulu"
      })
    }

    const { data } = await axios.get(`${base_url}/api/cekidch`, {
      params: { url: input },
      timeout: 20000
    })

    res.json(data)
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message })
  }
}
