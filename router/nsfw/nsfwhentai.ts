import { Request, Response } from "express"
import axios from "axios"

async function getApiKey(): Promise<string> {
  const response = await axios.get("https://raw.githubusercontent.com/saurusrawr/dbsaurus/refs/heads/main/keykazz.txt", {
    timeout: 10000,
  })
  return response.data.trim()
}

async function getNsfwHentai(): Promise<Buffer> {
  try {
    const apikey = await getApiKey()
    const response = await axios.get(`https://kayzzidgf.my.id/api/nsfw/hentai?apikey=${apikey}`, {
      responseType: "arraybuffer",
      timeout: 30000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    })
    return Buffer.from(response.data)
  } catch (error: any) {
    console.error("API Error:", error.message)
    throw new Error("Failed to get response from API")
  }
}

export default async function nsfwHentaiHandler(req: Request, res: Response) {
  try {
    const buffer = await getNsfwHentai()
    res.set({
      "Content-Type": "image/jpeg",
      "Content-Length": buffer.length.toString(),
      "Cache-Control": "public, max-age=3600",
    })
    res.send(buffer)
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message })
  }
}
