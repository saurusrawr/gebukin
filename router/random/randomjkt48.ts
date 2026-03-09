import { Request, Response } from "express"
import axios from "axios"
import * as cheerio from "cheerio"

async function scrapeJKT48Members(): Promise<{ name: string; image: string; team: string; url: string }[]> {
  const response = await axios.get("https://jkt48.com/member/list?lang=id", {
    timeout: 30000,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "id-ID,id;q=0.9",
    },
  })

  const $ = cheerio.load(response.data)
  const members: { name: string; image: string; team: string; url: string }[] = []

  $(".member-list-item, .member-item, li.member, .members-list li, .col-member").each((_, el) => {
    const name = $(el).find(".name, h3, h4, p.name, .member-name").text().trim()
    const image = $(el).find("img").attr("src") || $(el).find("img").attr("data-src") || ""
    const team = $(el).find(".team, .team-name, span.team").text().trim()
    const href = $(el).find("a").attr("href") || ""
    const url = href.startsWith("http") ? href : `https://jkt48.com${href}`

    if (name) {
      members.push({
        name,
        image: image.startsWith("http") ? image : `https://jkt48.com${image}`,
        team,
        url,
      })
    }
  })

  // fallback selector jika struktur berbeda
  if (members.length === 0) {
    $("a").each((_, el) => {
      const href = $(el).attr("href") || ""
      if (!href.includes("/member/")) return

      const name = $(el).find("img").attr("alt") || $(el).text().trim()
      const image = $(el).find("img").attr("src") || $(el).find("img").attr("data-src") || ""

      if (name && image) {
        members.push({
          name,
          image: image.startsWith("http") ? image : `https://jkt48.com${image}`,
          team: "",
          url: href.startsWith("http") ? href : `https://jkt48.com${href}`,
        })
      }
    })
  }

  if (members.length === 0) throw new Error("Gagal mengambil data member JKT48")

  return members
}

export default async function randomJkt48Handler(req: Request, res: Response) {
  try {
    const members = await scrapeJKT48Members()
    const random = members[Math.floor(Math.random() * members.length)]

    res.json({
      status: true,
      total_member: members.length,
      data: random,
    })
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message })
  }
}
  
