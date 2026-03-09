import { Request, Response } from "express"
import axios from "axios"

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#183;/g, "·")
    .replace(/&#233;/g, "é")
    .replace(/&[a-z]+;/gi, "")
    .replace(/&#\d+;/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

async function searchKBBI(query: string): Promise<any[]> {
  const response = await axios.get(`https://kbbi.web.id/${encodeURIComponent(query)}/ajax_`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Referer": "https://kbbi.web.id/",
      "X-Requested-With": "XMLHttpRequest",
    },
    timeout: 10000,
  })

  if (!Array.isArray(response.data)) {
    throw new Error("Format respon tidak valid dari KBBI")
  }

  return response.data
}

export default async function kbbiHandler(req: Request, res: Response) {
  const q = req.query.q as string

  if (!q || q.trim() === "") {
    return res.status(400).json({ status: false, message: "Parameter 'q' wajib diisi" })
  }

  try {
    const result = await searchKBBI(q.trim())

    if (result.length === 0) {
      return res.status(404).json({ status: false, message: `Kata '${q}' tidak ditemukan di KBBI` })
    }

    const data = result
      .filter((item: any) => item.d)
      .map((item: any) => ({
        kata: item.w,
        definisi: stripHtml(item.d),
      }))

    res.json({ status: true, query: q, total: data.length, data })
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message })
  }
      }
