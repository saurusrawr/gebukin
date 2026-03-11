import { Request, Response } from "express"
import axios from "axios"

// pic.re langsung return gambar pake tag query, skibidi
export default async function pussyHandler(req: Request, res: Response) {
  try {
    // pic.re langsung balikin gambar, ga perlu parse json dulu
    const { data, headers } = await axios.get("https://pic.re/image?tags=pussy", {
      responseType: "arraybuffer",
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })

    const mime = headers['content-type'] || 'image/jpeg'
    res.set('Content-Type', mime)
    res.send(Buffer.from(data))
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message })
  }
}
