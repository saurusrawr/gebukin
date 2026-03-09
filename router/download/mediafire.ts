import { Request, Response } from "express"
import axios from "axios"

async function mediafireDownloader(url: string) {
  try {
    const response = await axios.get("https://api.baguss.xyz/api/download/mediafire", {
      params: { url },
      timeout: 30000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    })

    if (!response.data.status) {
      throw new Error("Failed to get response from MediaFire API")
    }

    return response.data.result
  } catch (error: any) {
    console.error("Error fetching MediaFire data:", error.message)
    throw new Error("Failed to get response from MediaFire API")
  }
}

export default async function mediafireHandler(req: Request, res: Response) {
  const url = (req.query.url as string) || (req.body.url as string)

  if (!url) {
    return res.status(400).json({ status: false, message: "Parameter 'url' is required" })
  }

  if (!url.includes("mediafire.com")) {
    return res.status(400).json({ status: false, message: "URL must be a MediaFire link" })
  }

  try {
    const result = await mediafireDownloader(url)
    res.json({ status: true, data: result })
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message })
  }
}
