import { Request, Response } from "express"
import { chromium } from "playwright"

export default async function randomJkt48Handler(req: Request, res: Response) {
  let browser
  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    })

    const page = await browser.newPage()
    await page.setExtraHTTPHeaders({
      "Accept-Language": "id-ID,id;q=0.9",
    })

    await page.goto("https://jkt48.com/member/list?lang=id", { waitUntil: "domcontentloaded", timeout: 30000 })
    await page.waitForTimeout(2000)

    const members = await page.evaluate(() => {
      const result: { name: string; image: string; team: string; url: string }[] = []
      const els = document.querySelectorAll("li.member, .member-item, .col-member, .member-list-item, .members li")

      els.forEach((el) => {
        const name = el.querySelector(".name, h3, h4, p, .member-name")?.textContent?.trim() || ""
        const img = el.querySelector("img")
        const image = img?.getAttribute("src") || img?.getAttribute("data-src") || ""
        const team = el.querySelector(".team, span.team, .team-name")?.textContent?.trim() || ""
        const a = el.querySelector("a")
        const href = a?.getAttribute("href") || ""
        const url = href.startsWith("http") ? href : `https://jkt48.com${href}`

        if (name) result.push({ name, image: image.startsWith("http") ? image : `https://jkt48.com${image}`, team, url })
      })

      // fallback
      if (result.length === 0) {
        document.querySelectorAll("a[href*='/member/']").forEach((a) => {
          const img = a.querySelector("img")
          const name = img?.getAttribute("alt") || a.textContent?.trim() || ""
          const image = img?.getAttribute("src") || img?.getAttribute("data-src") || ""
          const href = a.getAttribute("href") || ""
          if (name && image) {
            result.push({
              name,
              image: image.startsWith("http") ? image : `https://jkt48.com${image}`,
              team: "",
              url: href.startsWith("http") ? href : `https://jkt48.com${href}`,
            })
          }
        })
      }

      return result
    })

    if (members.length === 0) {
      return res.status(500).json({ status: false, message: "Gagal mengambil data member JKT48" })
    }

    const random = members[Math.floor(Math.random() * members.length)]

    res.json({ status: true, total_member: members.length, data: random })
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message })
  } finally {
    if (browser) await browser.close()
  }
}
