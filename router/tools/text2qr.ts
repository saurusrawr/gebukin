import { Request, Response } from "express"
import QRCode from "qrcode"

async function generateQrCodeBuffer(text: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    QRCode.toBuffer(
      text,
      {
        errorCorrectionLevel: "H",
        type: "png",
        quality: 1,
        width: 1024,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      },
      (err, buffer) => {
        if (err) return reject(new Error("Failed to generate QR code"))
        resolve(buffer)
      }
    )
  })
}

export default async function text2qrHandler(req: Request, res: Response) {
  const text = req.query.text as string

  if (!text || text.trim() === "") {
    return res.status(400).json({ status: false, message: "Parameter 'text' wajib diisi" })
  }

  try {
    const buffer = await generateQrCodeBuffer(text.trim())

    res.set({
      "Content-Type": "image/png",
      "Content-Length": buffer.length.toString(),
      "Cache-Control": "public, max-age=3600",
      "Content-Disposition": `inline; filename="qrcode.png"`,
    })

    res.send(buffer)
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message })
  }
}
