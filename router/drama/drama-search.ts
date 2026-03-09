import { Request, Response } from "express"
import axios from "axios"

export default async function dramaSearchHandler(req: Request, res: Response) {
  const q = req.query.q as string

  if (!q || q.trim() === "") {
    return res.status(400).json({ status: false, message: "Parameter 'q' wajib diisi" })
  }

  try {
    const response = await axios.get(
      `https://api.zenzxz.my.id/drama/dramabox-search?q=${encodeURIComponent(q)}`,
      {
        timeout: 15000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36",
        },
      }
    )

    res.json({
      status: true,
      query: q,
      result: response.data.result || [],
    })
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message })
  }
}
