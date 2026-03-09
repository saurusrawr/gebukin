import { Request, Response } from "express"
import axios from "axios"
import * as cheerio from "cheerio"

interface McpedlResult {
  title: string
  link: string
  image: string
  rating: string
}

async function scrapeMcpedlSearch(query: string, max: number = 10): Promise<McpedlResult[]> {
  const { data } = await axios.get(`https://mcpedl.org/?s=${encodeURIComponent(query)}`, {
    timeout: 30000,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    },
  })

  const $ = cheerio.load(data)
  const result: McpedlResult[] = []

  $(".g-block.size-20 article").each((i, el) => {
    if (i >= max) return

    const title = $(el).find(".entry-title a").text().trim() || "No title"
    const link = $(el).find(".entry-title a").attr("href") || "No link"
    let image = $(el).find(".post-thumbnail img").attr("data-srcset") || $(el).find(".post-thumbnail img").attr("src") || "No image"

    if (image.includes(",")) {
      image = image.split(",")[0].split(" ")[0]
    }

    const rating = $(el).find(".rating-wrapper span").text().trim() || "No rating"
    result.push({ title, link, image, rating })
  })

  return result
}

export default async function mcpeHandler(req: Request, res: Response) {
  const q = req.query.q as string
  const max = parseInt(req.query.max as string) || 10

  if (!q || q.trim() === "") {
    return res.status(400).json({ status: false, message: "Parameter 'q' wajib diisi" })
  }

  try {
    const results = await scrapeMcpedlSearch(q.trim(), max)

    if (results.length === 0) {
      return res.json({ status: false, message: "Tidak ada hasil ditemukan" })
    }

    res.json({ status: true, total: results.length, data: results })
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message })
  }
}
