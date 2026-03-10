import { Request, Response } from "express"
import { createCanvas, loadImage, CanvasRenderingContext2D } from "canvas"
import axios from "axios"

function applyCircleMask(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.globalCompositeOperation = "destination-in"
  ctx.beginPath()
  ctx.arc(width / 2, height / 2, Math.min(width, height) / 2, 0, Math.PI * 2)
  ctx.closePath()
  ctx.fill()
}

async function generateCircleFromURL(imageURL: string): Promise<Buffer> {
  const response = await axios.get(imageURL, {
    responseType: "arraybuffer",
    timeout: 15000,
    headers: { "User-Agent": "Mozilla/5.0" },
  })
  const imgBuffer = Buffer.from(response.data)
  const img = await loadImage(imgBuffer)
  const canvas = createCanvas(img.width, img.height)
  const ctx = canvas.getContext("2d")
  ctx.drawImage(img, 0, 0)
  applyCircleMask(ctx, canvas.width, canvas.height)
  return canvas.toBuffer("image/png")
}

export default async function circleHandler(req: Request, res: Response) {
  const url = req.query.url as string

  if (!url || url.trim() === "") {
    return res.status(400).json({ status: false, message: "Parameter 'url' wajib diisi" })
  }

  try {
    new URL(url)
  } catch {
    return res.status(400).json({ status: false, message: "URL tidak valid" })
  }

  try {
    const buffer = await generateCircleFromURL(url.trim())

    res.set({
      "Content-Type": "image/png",
      "Content-Length": buffer.length.toString(),
      "Cache-Control": "public, max-age=3600",
      "Content-Disposition": `inline; filename="circle.png"`,
    })

    res.send(buffer)
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message })
  }
}
