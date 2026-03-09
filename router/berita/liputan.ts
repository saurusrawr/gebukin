import { Request, Response } from "express"
import axios from "axios"
import * as cheerio from "cheerio"

const base_url = "https://www.liputan6.com"

async function scrapeLiputan6News() {
  const response = await axios.get(base_url, {
    timeout: 30000,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    },
  })

  const $ = cheerio.load(response.data)
  const result: any[] = []

  $(".articles--iridescent-list article").each((_, e) => {
    const title = $(".articles--iridescent-list--text-item__title-link-text", e).text().trim()
    const link = $("h4.articles--iridescent-list--text-item__title a", e).attr("href")
    const image_thumbnail = $("picture.articles--iridescent-list--text-item__figure-image img", e).attr("src")
    const time = $(".articles--iridescent-list--text-item__time", e).text().trim()

    if (title && link) {
      result.push({ title, link, image_thumbnail, time })
    }
  })

  if (result.length === 0) throw new Error("Tidak ada berita ditemukan")

  return result
}

export default async function liputanHandler(req: Request, res: Response) {
  try {
    const data = await scrapeLiputan6News()
    res.json({ status: true, total: data.length, data })
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message })
  }
}
