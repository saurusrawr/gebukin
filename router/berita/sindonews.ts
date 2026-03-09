import { Request, Response } from "express"
import axios from "axios"
import * as cheerio from "cheerio"

async function scrapeLatestNews() {
  const response = await axios.get("https://www.sindonews.com/", {
    timeout: 15000,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    },
  })

  const $ = cheerio.load(response.data)
  const articles: any[] = []

  $(".list-article").each((_, element) => {
    const title = $(element).find(".title-article").text().trim()
    const link = $(element).find("a").attr("href") || null
    const category = $(element).find(".sub-kanal").text().trim() || null
    const timestamp = $(element).find(".date-article").text().trim() || null
    const imageUrl = $(element).find("img.lazyload").attr("data-src") || null

    if (title && link) {
      articles.push({ title, link, category, timestamp, imageUrl })
    }
  })

  return articles
}

export default async function sindonewsHandler(req: Request, res: Response) {
  try {
    const articles = await scrapeLatestNews()

    if (articles.length === 0) {
      return res.json({ status: false, message: "Tidak ada berita ditemukan" })
    }

    res.json({ status: true, total: articles.length, data: articles })
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message })
  }
}
