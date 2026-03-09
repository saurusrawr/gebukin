import { Request, Response } from "express"
import axios from "axios"
import * as cheerio from "cheerio"

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
  "Accept-Encoding": "gzip, deflate, br",
  "Connection": "keep-alive",
  "Upgrade-Insecure-Requests": "1",
}

async function safeFetchCss(href: string): Promise<{ href: string; content: string; status: string }> {
  try {
    const res = await axios.get(href, {
      timeout: 8000,
      headers: {
        "User-Agent": HEADERS["User-Agent"],
        "Accept": "text/css,*/*;q=0.1",
        "Referer": href,
      },
    })
    return { href, content: res.data, status: "ok" }
  } catch {
    return { href, content: "", status: "failed" }
  }
}

async function fetchCode(url: string) {
  const response = await axios.get(url, {
    timeout: 30000,
    headers: HEADERS,
  })

  const html = response.data as string
  const $ = cheerio.load(html)
  const baseUrl = new URL(url).origin
  const basePath = url.substring(0, url.lastIndexOf("/") + 1)

  // Resolve URL helper
  const resolveUrl = (href: string): string => {
    if (href.startsWith("http")) return href
    if (href.startsWith("//")) return `https:${href}`
    if (href.startsWith("/")) return `${baseUrl}${href}`
    return `${basePath}${href}`
  }

  // Fetch CSS external secara parallel
  const cssLinks = $('link[rel="stylesheet"]')
    .map((_, el) => $(el).attr("href"))
    .get()
    .filter(Boolean) as string[]

  const cssFiles = await Promise.all(
    cssLinks.map(href => safeFetchCss(resolveUrl(href)))
  )

  const inlineStyles: string[] = []
  $("style").each((_, el) => {
    const content = $(el).html()?.trim()
    if (content) inlineStyles.push(content)
  })

  // Ambil juga JS external (bonus)
  const jsLinks = $('script[src]')
    .map((_, el) => $(el).attr("src"))
    .get()
    .filter(Boolean) as string[]

  return {
    url,
    html,
    css: {
      external: cssFiles.filter(c => c.status === "ok"),
      external_failed: cssFiles.filter(c => c.status === "failed").map(c => c.href),
      inline: inlineStyles,
    },
    js_external: jsLinks.map(src => resolveUrl(src)),
    stats: {
      external_css: cssFiles.filter(c => c.status === "ok").length,
      failed_css: cssFiles.filter(c => c.status === "failed").length,
      inline_style: inlineStyles.length,
      external_js: jsLinks.length,
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
