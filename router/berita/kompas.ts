import { Request, Response } from "express"
import got from "got"
import * as cheerio from "cheerio"

async function scrapeKompasNews() {
  try {
    const response = await got("https://news.kompas.com", {
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9,id;q=0.8",
      },
      timeout: {
        request: 30000,
      },
      retry: {
        limit: 3,
        methods: ["GET"],
        statusCodes: [408, 413, 429, 500, 502, 503, 504],
        errorCodes: [
          "ETIMEDOUT",
          "ECONNRESET",
          "EADDRINUSE",
          "ECONNREFUSED",
          "EPIPE",
          "ENOTFOUND",
          "ENETUNREACH",
          "EAI_AGAIN",
        ],
        calculateDelay: (retryObject: { attemptCount: number }) => {
          return Math.min(1000 * Math.pow(2, retryObject.attemptCount), 10000)
        },
      },
    })

    const $ = cheerio.load(response.body)
    const results: Record<string, any>[] = []

    $(".articleList.-list .articleItem").each((_, element) => {
      const $article = $(element)

      const title = $article.find(".articleTitle").text().trim()
      const link = $article.find(".article-link").attr("href")
      const image = $article.find(".articleItem-img img").data("src")
      const category = $article.find(".articlePost-subtitle").text().trim()
      const date = $article.find(".articlePost-date").text().trim()

      if (title && link) {
        results.push({ title, link, image, category, date })
      }
    })

    return results
  } catch (error: any) {
    console.error("Error scraping Kompas News:", error)
    throw new Error(error.message || "Failed to scrape Kompas News")
  }
}

export default async function kompasNewsHandler(req: Request, res: Response) {
  try {
    const result = await scrapeKompasNews()
    res.json({ status: true, total: result.length, data: result })
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message })
  }
}
