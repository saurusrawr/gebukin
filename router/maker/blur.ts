import { Request, Response } from "express"
import * as Canvas from "canvas"
import * as FileType from "file-type"
import multer from "multer"
import axios from "axios"

const upload = multer({ storage: multer.memoryStorage() })
export const middleware = upload.single("file")

async function isValidImageBuffer(buffer: Buffer) {
  const type = await FileType.fromBuffer(buffer)
  return type && ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"].includes(type.mime)
}

async function generateBlurImage(img: Canvas.Image): Promise<Buffer> {
  const canvas = Canvas.createCanvas(img.width, img.height)
  const ctx = canvas.getContext("2d")

  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width / 4, canvas.height / 4)
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(canvas, 0, 0, canvas.width / 4, canvas.height / 4, 0, 0, canvas.width + 5, canvas.height + 5)

  return canvas.toBuffer()
}

export default async function blurHandler(req: Request, res: Response) {
  try {
    let buffer: Buffer | null = null

    if (req.file) {
      const valid = await isValidImageBuffer(req.file.buffer)
      if (!valid) return res.status(400).json({ status: false, message: "File harus berupa gambar (png, jpg, webp, gif)" })
      buffer = req.file.buffer
    } else if (req.query.url) {
      const imageUrl = req.query.url as string
      const response = await axios.get(imageUrl, { responseType: "arraybuffer", timeout: 15000 })
      buffer = Buffer.from(response.data)
      const valid = await isValidImageBuffer(buffer)
      if (!valid) return res.status(400).json({ status: false, message: "URL bukan gambar yang valid" })
    } else {
      return res.status(400).json({ status: false, message: "Kirim gambar via 'file' (multipart) atau parameter 'url'" })
    }

    const img = await Canvas.loadImage(buffer)
    const result = await generateBlurImage(img)

    res.set({
      "Content-Type": "image/png",
      "Content-Length": result.length.toString(),
      "Cache-Control": "public, max-age=3600",
    })
    res.send(result)
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message })
  }
}
