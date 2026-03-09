import { Request, Response } from "express"
import fetch from "node-fetch"
import * as cheerio from "cheerio"

async function scrapeKbbi(q: string) {
  const response = await fetch(
    `https://kbbi.kemdikbud.go.id/entri/${encodeURIComponent(q)}`,
    {
      timeout: 30000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    } as any,
  )

  if (!response.ok) {
    throw new Error("Network response was not ok " + response.statusText)
  }

  const html = await response.text()
  const $ = cheerio.load(html)
  const isExist = !/tidak ditemukan/i.test(
    $("body > div.container.body-content > h4[style=\"color:red\"]").text(),
  )

  if (!isExist) {
    throw new Error(`${q} tidak ditemukan di KBBI`)
  }

  const results: { index: number; title: string; means: string[] }[] = []
  let isContent = false
  let lastTitle: string | undefined

  $("body > div.container.body-content")
    .children()
    .each((_, el) => {
      const tag = el.tagName
      const elem = $(el)

      if (tag === "hr") {
        isContent = !isContent && !results.length
      }

      if (tag === "h2" && isContent) {
        const indexText = elem.find("sup").text().trim()
        const index = parseInt(indexText) || 0
        const title = elem.text().trim()
        results.push({ index, title, means: [] })
        lastTitle = title
      }

      if ((tag === "ol" || tag === "ul") && isContent && lastTitle) {
        elem.find("li").each((_, liEl) => {
          const li = $(liEl).text().trim()
          const idx = results.findIndex(({ title }) => title === lastTitle)
          if (idx !== -1) {
            results[idx].means.push(li)
          }
        })
        lastTitle = undefined
      }
    })

  if (results.length === 0) {
    throw new Error(`${q} tidak ditemukan di KBBI`)
  }

  return results
}

export default async function kbbiHandler(req: Request, res: Response) {
  const q = req.query.q as string

  if (!q || q.trim() === "") {
    return res.status(400).json({ status: false, message: "Parameter 'q' wajib diisi" })
  }

  try {
    const data = await scrapeKbbi(q.trim())
    res.json({ status: true, query: q, total: data.length, data })
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message })
  }
}
