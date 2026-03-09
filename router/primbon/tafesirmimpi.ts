import { Request, Response } from "express"
import axios from "axios"
import * as cheerio from "cheerio"

async function scrapeTafsirMimpi(mimpi: string) {
  const response = await axios.get("https://www.primbon.com/tafsir_mimpi.php", {
    params: { mimpi, submit: "+Submit+" },
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    },
    timeout: 10000,
  })

  const $ = cheerio.load(response.data)
  const results: { mimpi: string; tafsir: string }[] = []

  const content = $("#body").text()
  const mimpiRegex = new RegExp(`Mimpi.*?${mimpi}.*?(?=Mimpi|$)`, "gi")
  const matches = content.match(mimpiRegex)

  if (matches) {
    matches.forEach((match) => {
      const cleanText = match.trim().replace(/\s+/g, " ").replace(/\n/g, " ")
      const parts = cleanText.split("=")
      if (parts.length === 2) {
        results.push({
          mimpi: parts[0].trim().replace(/^Mimpi\s+/, ""),
          tafsir: parts[1].trim(),
        })
      }
    })
  }

  const solusiMatch = $("#body").text().match(/Solusi.*?Amien\.\./s)

  return {
    keyword: mimpi,
    hasil: results,
    total: results.length,
    solusi: solusiMatch ? solusiMatch[0].trim() : null,
  }
}

export default async function tafsirMimpiHandler(req: Request, res: Response) {
  const mimpi = req.query.mimpi as string

  if (!mimpi || mimpi.trim() === "") {
    return res.status(400).json({ status: false, message: "Parameter 'mimpi' wajib diisi" })
  }

  try {
    const data = await scrapeTafsirMimpi(mimpi.trim())
    res.json({ status: true, data })
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message })
  }
}
