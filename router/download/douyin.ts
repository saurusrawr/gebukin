import { Request, Response } from "express"
import axios from "axios"

export default async function douyinHandler(req: Request, res: Response) {
  const url = String(req.query.url || "").trim()

  if (!url) {
    return res.status(400).json({
      status: false,
      message: "parameter 'url' wajib diisi, contoh: ?url=https://www.douyin.com/video/xxx"
    })
  }

  try {
    const { data } = await axios.post('https://snapvideotools.com/id/api/snap',
      { text: url },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'X-Requested-With': 'XMLHttpRequest',
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
          'Referer': 'https://snapvideotools.com/id/douyin-downloader'
        },
        timeout: 15000
      }
    )

    if (data.code !== 0 || !data.data) {
      return res.status(500).json({ status: false, message: "gagal ambil data dari snapvideotools" })
    }

    const r = data.data
    res.json({
      status: true,
      title: r.title || 'No Title',
      platform: r.platformName,
      thumbnail: r.cover,
      medias: r.mediaUrls.map((m: any) => ({
        type: m.type,
        url: m.url,
        ext: m.suffix
      }))
    })
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message })
  }
      }
