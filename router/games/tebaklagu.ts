import { Request, Response } from "express"
import axios from "axios"

async function getRandomSong() {
  try {
    const response = await axios.get(
      "https://raw.githubusercontent.com/qisyana/scrape/main/tebaklagu.json",
      {
        timeout: 30000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      },
    )
    const src = response.data
    return src[Math.floor(Math.random() * src.length)]
  } catch (error: any) {
    console.error("API Error:", error.message)
    throw new Error("Error fetching data: " + error.message)
  }
}

export default async function tebaklaguHandler(req: Request, res: Response) {
  try {
    const result = await getRandomSong()
    res.json({ status: true, data: result })
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message })
  }
}
