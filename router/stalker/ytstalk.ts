import { Request, Response } from "express"
import axios from "axios"

async function ytStalk(username: string) {
  try {
    const response = await axios.get("https://api.baguss.xyz/api/stalker/ytstalk", {
      params: { username },
      timeout: 30000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    })

    if (!response.data.status) {
      throw new Error("Failed to get response from YouTube Stalk API")
    }

    return response.data.result
  } catch (error: any) {
    console.error("Error fetching YouTube data:", error.message)
    throw new Error("Failed to get response from YouTube Stalk API")
  }
}

export default async function ytStalkHandler(req: Request, res: Response) {
  const username = (req.query.username as string) || (req.query.user as string)

  if (!username) {
    return res.status(400).json({ status: false, message: "Parameter 'username' is required" })
  }

  try {
    const result = await ytStalk(username)
    res.json({ status: true, data: result })
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message })
  }
}
