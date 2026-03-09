import { Request, Response } from "express"
import axios from "axios"

async function getRandomCatImage(): Promise<Buffer> {
  try {
    const API_URL = "https://api.sefinek.net/api/v2/random/animal/cat"
    const { data } = await axios.get(API_URL, {
      timeout: 30000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    })

    if (!data || !data.message) {
      throw new Error("Invalid response from external API: Missing image URL.")
    }

    const imageResponse = await axios.get(data.message, {
      responseType: "arraybuffer",
      timeout: 30000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    })

    return Buffer.from(imageResponse.data, "binary")
  } catch (error: any) {
    console.error("API Error:", error.message)
    throw new Error("Failed to get random cat image from API")
  }
}

export default async function catHandler(req: Request, res: Response) {
  try {
    const buffer = await getRandomCatImage()
    res.set({
      "Content-Type": "image/jpeg",
      "Content-Length": buffer.length.toString(),
      "Cache-Control": "public, max-age=3600",
      "Content-Disposition": `inline; filename="cat.jpg"`,
    })
    res.send(buffer)
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message })
  }
}
