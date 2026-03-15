import { Request, Response } from "express"
import axios from "axios"
import FormData from "form-data"

// erase.bg gratis tanpa login, ga pake cloudflare
const BASE = "https://www.erase.bg"

export default async function rmvbgHandler(req: Request, res: Response) {
  const url = String(req.query.url || "").trim()

  if (!url) {
    return res.status(400).json({
      status: false,
      message: "parameter 'url' wajib diisi (url gambar)"
    })
  }

  try {
    // donlot gambar user dulu
    const { data: img_data, headers: img_headers } = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    const mime = img_headers['content-type']?.split(';')[0] || 'image/jpeg'
    const ext = mime.includes('png') ? 'png' : 'jpg'
    const buf = Buffer.from(img_data)

    // upload ke erase.bg
    const form = new FormData()
    form.append('image_file', buf, { filename: `image.${ext}`, contentType: mime })
    form.append('image_url', '')

    const { data } = await axios.post(`${BASE}/api/remove-background`, form, {
      headers: {
        ...form.getHeaders(),
        'Accept': 'application/json',
        'Origin': BASE,
        'Referer': `${BASE}/`,
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36'
      },
      timeout: 60000,
      maxBodyLength: Infinity
    })

    if (!data?.url && !data?.data?.url) {
      throw new Error("erase.bg ga return url hasil")
    }

    const hasil_url = data?.url || data?.data?.url

    res.json({
      status: true,
      result: hasil_url
    })
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message })
  }
}
