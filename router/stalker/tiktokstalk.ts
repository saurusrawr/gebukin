import { Request, Response } from "express"
import axios from "axios"
import * as cheerio from "cheerio"

const userAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0",
]

function getRandomUA(): string {
  return userAgents[Math.floor(Math.random() * userAgents.length)]
}

function randomDelay(min = 500, max = 1500): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function tiktokStalk(user: string) {
  try {
    await randomDelay()

    const ua = getRandomUA()
    const response = await axios.get(`https://www.tiktok.com/@${user}`, {
      timeout: 30000,
      headers: {
        "User-Agent": ua,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Sec-Ch-Ua": '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
        "Referer": "https://www.google.com/",
      },
    })

    const $ = cheerio.load(response.data)
    const data = $("#__UNIVERSAL_DATA_FOR_REHYDRATION__").text()

    if (!data) throw new Error("Failed to extract data from TikTok page.")

    const result = JSON.parse(data)

    if (result["__DEFAULT_SCOPE__"]["webapp.user-detail"].statusCode !== 0) {
      throw new Error("User not found!")
    }

    return result["__DEFAULT_SCOPE__"]["webapp.user-detail"]["userInfo"]
  } catch (err: any) {
    throw new Error(`Error stalking TikTok user: ${err.message || err}`)
  }
}

export default async function tiktokStalkHandler(req: Request, res: Response) {
  const user = (req.query.user as string) || (req.query.username as string)

  if (!user) {
    return res.status(400).json({ status: false, message: "Parameter 'user' is required" })
  }

  try {
    const result = await tiktokStalk(user)
    res.json({ status: true, data: result })
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message })
  }
}
