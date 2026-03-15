import { Request, Response } from "express"
import axios from "axios"

const UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'

export default async function videyHandler(req: Request, res: Response) {
  const url = String(req.query.url || "").trim()

  if (!url) {
    return res.status(400).json({
      status: false,
      message: "parameter 'url' wajib diisi, contoh: ?url=https://videy.co/v/?id=MD4QKKQt1"
    })
  }

  // validasi format url nya dulu
  if (!url.includes('id=')) {
    return res.status(400).json({
      status: false,
      message: "format url salah, harus ada 'id=' di dalamnya"
    })
  }

  try {
    const id = url.split('id=')[1]
    const direct_url = `https://cdn.videy.co/${id}.mp4`

    // head request aja biar ga donlot videonya, cukup metadata
    const head = await axios.head(direct_url, {
      headers: { 'User-Agent': UA },
      timeout: 10000
    })

    const size_bytes = parseInt(head.headers['content-length'] || '0', 10)
    const size_mb = (size_bytes / (1024 * 1024)).toFixed(2)

    res.json({
      status: true,
      id,
      direct_link: direct_url,
      mime_type: head.headers['content-type'],
      size: `${size_mb} MB`,
      fetched_at: new Date().toISOString()
    })
  } catch (err: any) {
    res.status(err.response?.status || 500).json({
      status: false,
      message: err.message
    })
  }
}
