import { Request, Response } from "express"
import axios from "axios"
import * as cheerio from "cheerio"

async function scrapeKodepos(form: string) {
  const response = await axios.post(
    "https://kodepos.posindonesia.co.id/CariKodepos",
    new URLSearchParams({ kodepos: form }).toString(),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Cache-Control": "max-age=0",
        "Origin": "https://kodepos.posindonesia.co.id",
        "Referer": "https://kodepos.posindonesia.co.id/",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
        "Cookie": "ci_session=aqlrvi6tdfajmfelsla8n974p1btd9pb",
      },
      timeout: 30000,
    }
  )

  const $ = cheerio.load(response.data)
  const result = $("tbody > tr").map((_, el) => {
    const $td = $(el).find("td")
    return {
      kodepos: $td.eq(1).text().trim(),
      desa: $td.eq(2).text().trim(),
      kecamatan: $td.eq(3).text().trim(),
      kota: $td.eq(4).text().trim(),
      provinsi: $td.eq(5).text().trim(),
    }
  }).get().filter(r => r.kodepos)

  return result
}

export default async function kodeposHandler(req: Request, res: Response) {
  const q = req.query.q as string

  if (!q || q.trim() === "") {
    return res.status(400).json({ status: false, message: "Parameter 'q' wajib diisi (nama desa, kecamatan, kota, atau kode pos)" })
  }

  try {
    const results = await scrapeKodepos(q.trim())

    if (results.length === 0) {
      return res.json({ status: false, message: "Data tidak ditemukan" })
    }

    res.json({ status: true, total: results.length, data: results })
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message })
  }
}
