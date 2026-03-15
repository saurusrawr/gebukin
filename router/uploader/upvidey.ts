import { Request, Response } from "express"
import axios from "axios"
import FormData from "form-data"
import multer from "multer"

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
})

export const middleware = upload.single("file")

export default async function upvideyHandler(req: Request, res: Response) {
  if (!req.file) {
    return res.status(400).json({ status: false, message: "File video wajib diupload" })
  }

  if (!/video/.test(req.file.mimetype)) {
    return res.status(400).json({ status: false, message: "File harus berupa video" })
  }

  try {
    const form = new FormData()
    form.append("file", req.file.buffer, {
      filename: "video.mp4",
      contentType: "video/mp4",
    })

    const response = await axios.post("https://videy.co/api/upload", form, {
      headers: {
        ...form.getHeaders(),
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Origin": "https://videy.co",
        "Referer": "https://videy.co/",
      },
      timeout: 60000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    })

    const data = response.data
    const videoId = data?.id || data?.videoId || data?.uid

    if (!videoId) throw new Error("Gagal mendapatkan ID video dari Videy")

    const videoUrl = `https://videy.co/v?id=${videoId}`

    res.json({ status: true, data: { id: videoId, url: videoUrl } })
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message })
  }
}
