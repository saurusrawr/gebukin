import { Request, Response } from "express"
import axios from "axios"

const API_KEY = process.env.APIKEY_BOTCAHX || ""
const API_URL = "https://api.botcahx.eu.org/api/search/linkgroupwa"

export default async function carigrpwaHandler(req: Request, res: Response) {
  const q = String(req.query.q || req.query.query || '').trim()

  if (!q) {
    return res.status(400).json({
      status: false,
      message: "Parameter 'q' wajib diisi. Contoh: q=gaming"
    })
  }

  if (!API_KEY) {
    return res.status(500).json({ status: false, message: "APIKEY_BOTCAHX belum diset di env" })
  }

  try {
    const { data } = await axios.get(API_URL, {
      params: { apikey: API_KEY, text1: q },
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })

    if (!data || data.status === false) {
      return res.status(500).json({ status: false, message: data?.message || "Gagal mengambil data" })
    }

    const raw = data.result || data.data || data.groups || []
    const groups = raw.map((g: any) => ({
      title: g.title || g.name || 'Grup WhatsApp',
      description: g.description || g.desc || '-',
      link: g.link || g.url || g.invite || ''
    })).filter((g: any) => g.link)

    res.json({ status: true, query: q, total: groups.length, groups })
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message })
  }
}
