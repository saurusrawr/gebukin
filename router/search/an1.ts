import { Request, Response } from "express"
import axios from "axios"
import * as cheerio from "cheerio"

async function scrape(search: string) {
  const response = await axios.get(
    `https://an1.com/?story=${encodeURIComponent(search)}&do=search&subaction=search`,
    {
      timeout: 30000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    }
  )

  const $ = cheerio.load(response.data)
  const applications: any[] = []

  $(".item").each((_, element) => {
    const $el = $(element)
    applications.push({
      title: $el.find(".name a span").text().trim(),
      link: $el.find(".name a").attr("href") || null,
      developer: $el.find(".developer").text().trim() || null,
      image: $el.find(".img img").attr("src") || null,
      rating: {
        value: parseFloat($el.find(".current-rating").text()) || null,
        percentage: parseInt(
          $el.find(".current-rating").attr("style")?.replace("width:", "").replace("%;", "") || "0"
        ),
      },
      type: $el.find(".item_app").hasClass("mod") ? "MOD" : "Original",
    })
  })

  return applications
}

export default async function an1Handler(req: Request, res: Response) {
  const q = req.query.q as string

  if (!q || q.trim() === "") {
    return res.status(400).json({ status: false, message: "Parameter 'q' wajib diisi" })
  }

  try {
    const results = await scrape(q.trim())

    if (results.length === 0) {
      return res.json({ status: false, message: "Tidak ada hasil ditemukan" })
    }

    res.json({ status: true, total: results.length, data: results })
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message })
  }
}
