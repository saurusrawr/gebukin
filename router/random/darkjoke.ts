import { Request, Response } from "express"
import axios from "axios"

const saurus_url = "https://raw.githubusercontent.com/saurusrawr/saurusdb/refs/heads/main/alljson/darkjoke.json"

export default async function darkjokeHandler(req: Request, res: Response) {
  try {
    const { data } = await axios.get<string[]>(saurus_url, { timeout: 10000 })

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(500).json({ status: false, message: "Data kosong" })
    }

    const random = data[Math.floor(Math.random() * data.length)]

    const imgRes = await axios.get(random, {
      responseType: "arraybuffer",
      timeout: 15000,
      headers: { "User-Agent": "Mozilla/5.0" },
    })

    const contentType = imgRes.headers["content-type"] || "image/jpeg"
    res.set({
      "Content-Type": contentType,
      "Content-Length": imgRes.data.length.toString(),
      "Cache-Control": "public, max-age=3600",
    })
    res.send(Buffer.from(imgRes.data))
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message })
  }
}
