import { Request, Response } from "express"
import axios from "axios"
import * as cheerio from "cheerio"

async function fetchCode(url: string) {
  const response = await axios.get(url, {
    timeout: 30000,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  })

  const html = response.data as string
  const $ = cheerio.load(html)
  const baseUrl = new URL(url).origin

  const cssFiles: { href: string; content: string }[] = []
  const cssLinks = $('link[rel="stylesheet"]')

  for (let i = 0; i < cssLinks.length; i++) {
    const href = $(cssLinks[i]).attr("href")
    if (!href) continue

    const fullUrl = href.startsWith("http") ? href : href.startsWith("//") ? `https:${href}` : `${baseUrl}${href.startsWith("/") ? "" : "/"}${href}`

    try {
      const cssResponse = await axios.get(fullUrl, {
        timeout: 10000,
        headers: { "User-Agent": "Mozilla/5.0" },
      })
      cssFiles.push({ href: fullUrl, content: cssResponse.data })
    } catch {
      cssFiles.push({ href: fullUrl, content: "/* Failed to fetch */" })
    }
  }

  const inlineStyles: string[] = []
  $("style").each((_, el) => {
    const content = $(el).html()?.trim()
    if (content) inlineStyles.push(content)
  })

  return {
    url,
    html,
    css: {
      external: cssFiles,
      inline: inlineStyles,
    },
    stats: {
      external_css: cssFiles.length,
      inline_style: inlineStyles.length,
    },
  }
}

export default async function getCodeHandler(req: Request, res: Response) {
  const url = req.query.url as string

  if (!url || url.trim() === "") {
    return res.status(400).json({ status: false, message: "Parameter 'url' wajib diisi" })
  }

  try {
    new URL(url)
  } catch {
    return res.status(400).json({ status: false, message: "URL tidak valid" })
  }

  try {
    const data = await fetchCode(url.trim())
    res.json({ status: true, data })
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message })
  }
}
