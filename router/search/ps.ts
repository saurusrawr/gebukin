import { Request, Response } from "express"
import axios from "axios"
import * as cheerio from "cheerio"

async function PlayStore(search: string) {
  const { data } = await axios.get(
    `https://play.google.com/store/search?q=${encodeURIComponent(search)}&c=apps`,
    {
      timeout: 30000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    }
  )

  const $ = cheerio.load(data)
  const hasil: any[] = []

  $(".ULeU3b > .VfPpkd-WsjYwc.VfPpkd-WsjYwc-OWXEXe-INsAgc.KC1dQ.Usd1Ac.AaN0Dd.Y8RQXd > .VfPpkd-aGsRMb > .VfPpkd-EScbFb-JIbuQc.TAQqTe > a").each((_, u) => {
    const linkk = $(u).attr("href")
    const nama = $(u).find(".j2FCNc > .cXFu1 > .ubGTjb > .DdYX5").text()
    const developer = $(u).find(".j2FCNc > .cXFu1 > .ubGTjb > .wMUdtb").text()
    let img = $(u).find(".j2FCNc > img").attr("src")

    if (img && img.includes("=s64")) {
      img = img.replace("=s64", "=w480-h960-rw")
    }

    const rate = $(u).find(".j2FCNc > .cXFu1 > .ubGTjb > div").attr("aria-label")
    const rate2 = $(u).find(".j2FCNc > .cXFu1 > .ubGTjb > div > span.w2kbF").text()
    const link = `https://play.google.com${linkk}`

    hasil.push({
      link: link,
      nama: nama || "No name",
      developer: developer || "No Developer",
      img: img || "https://i.ibb.co/G7CrCwN/404.png",
      rate: rate || "No Rate",
      rate2: rate2 || "No Rate",
      link_dev: `https://play.google.com/store/apps/developer?id=${(developer || "").split(" ").join("+")}`,
    })
  })

  if (hasil.length === 0) throw new Error("No result found!")
  return hasil
}

export default async function playstoreHandler(req: Request, res: Response) {
  const q = req.query.q as string

  if (!q || q.trim() === "") {
    return res.status(400).json({ status: false, message: "Parameter 'q' wajib diisi" })
  }

  try {
    const results = await PlayStore(q.trim())
    res.json({ status: true, total: results.length, data: results })
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message })
  }
}
