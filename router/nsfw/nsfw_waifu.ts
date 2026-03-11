import { Request, Response } from "express"
import axios from "axios"

// waifu dari waifu.pics, langsung buffer no cap
export default async function waifuHandler(req: Request, res: Response) {
  try {
    const { data } = await axios.get("https://api.waifu.pics/nsfw/waifu", { timeout: 10000 })
    if (!data?.url) throw new Error("zonk ga ada url nya")

    // donlot langsung jadi buffer, skibidi
    const { data: buf } = await axios.get(data.url, { responseType: "arraybuffer", timeout: 15000 })
    res.set("Content-Type", "image/jpeg")
    res.send(Buffer.from(buf))
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message })
  }
}
