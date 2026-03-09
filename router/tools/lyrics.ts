import { Request, Response } from "express"
import axios from "axios"

async function searchLyrics(query: string) {
  try {
    const response = await axios.get("https://chocomilk.amira.us.kg/v1/search/lyrics", {
      params: { query },
      timeout: 30000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    })

    if (!response.data.success) {
      throw new Error("Failed to get lyrics")
    }

    return response.data.data
  } catch (error: any) {
    console.error("Error fetching lyrics:", error.message)
    throw new Error("Failed to get lyrics")
  }
}

export default async function lyricsHandler(req: Request, res: Response) {
  const query = (req.query.q as string) || (req.query.query as string)

  if (!query) {
    return res.status(400).json({ status: false, message: "Parameter 'q' is required" })
  }

  try {
    const result = await searchLyrics(query)
    res.json({ status: true, data: result })
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message })
  }
}
