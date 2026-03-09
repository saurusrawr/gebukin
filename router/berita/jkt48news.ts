import { Request, Response } from "express"
import got from "got"
import * as cheerio from "cheerio"

async function scrapeJKT48News() {
  try {
    const response = await got("https://jkt48.com/news/list?lang=id", {
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

    $(".entry-news__list").each((_, element) => {
      const $item = $(element)

      if ($item.hasClass("entry-news__list--pagination")) return

      const title = $item.find(".entry-news__list--item h3 a").text().trim()
      const link = "https://jkt48.com" + $item.find(".entry-news__list--item h3 a").attr("href")
      const date = $item.find(".entry-news__list--item time").text().trim()
      const icon = "https://jkt48.com" + $item.find(".entry-news__list--label img").attr("src")

      if (title && link) {
        results.push({ title, link, date, icon })
      }
    })

    return results
  } catch (error: any) {
    console.error("Error scraping JKT48 News:", error)
    throw new Error(error.message || "Failed to scrape JKT48 News")
  }
}

export default async function jkt48NewsHandler(req: Request, res: Response) {
  try {
    const result = await scrapeJKT48News()
    res.json({ status: true, total: result.length, data: result })
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message })
  }
}
