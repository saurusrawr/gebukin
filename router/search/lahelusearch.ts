import { Request, Response } from "express"
import axios from "axios"

export default async function lahelusearchHandler(req: Request, res: Response) {
  const q = String(req.query.q || req.query.query || "").trim()

  if (!q) {
    return res.status(400).json({
      status: false,
      message: "parameter 'q' wajib diisi cik, contoh: ?q=spongebob"
    })
  }

  try {
    const { data } = await axios.get("https://lahelu.com/api/post/get-search", {
      params: { query: q },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36'
      },
      timeout: 10000
    })

    const posts = data.postInfos
    if (!posts?.length) {
      return res.json({ status: false, message: "meme ga ketemu, coba query lain" })
    }

    // rapiin datanya biar enak dipake
    const hasil = posts.map((item: any) => ({
      title: item.title,
      author: item.userUsername,
      media: item.media,
      post_id: item.postID,
      hashtags: item.hashtags || []
    }))

    res.json({
      status: true,
      query: q,
      total: hasil.length,
      results: hasil
    })
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message })
  }
}
