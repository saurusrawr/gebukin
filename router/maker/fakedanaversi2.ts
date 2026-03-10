import { Request, Response } from "express"
import { createCanvas, loadImage, registerFont } from "canvas"
import path from "path"

const __dirname = path.resolve()

registerFont(path.join(__dirname, "font/f5803c-1772975107907.ttf"), { family: "CartoonVibes" })

const TARGET_W = 2200

export default async function generateDanaHandler(req: Request, res: Response) {
  try {
    const angka = (req.query.angka || req.body?.angka) as string

    if (!angka) return res.status(400).json({ status: false, message: "Parameter 'angka' wajib diisi" })

    const raw = Number(String(angka).replace(/\./g, "").replace(/,/g, ""))
    if (isNaN(raw) || raw <= 0) return res.status(400).json({ status: false, message: "Nominal tidak valid" })

    const formatted = raw.toLocaleString("id-ID")

    const bg = await loadImage("https://raw.githubusercontent.com/saurusrawr/storagebot/refs/heads/main/uploads/9c18e0-1772932032348.jpg")
    const logo = await loadImage("https://raw.githubusercontent.com/saurusrawr/storagebot/refs/heads/main/uploads/d0f081-1772929197100.png")

    const SCALE = TARGET_W / bg.width
    const TARGET_H = Math.round(bg.height * SCALE)
    const canvas = createCanvas(TARGET_W, TARGET_H)
    const ctx = canvas.getContext("2d")

    ctx.drawImage(bg, 0, 0, TARGET_W, TARGET_H)

    ctx.font = `${Math.round(205 * SCALE)}px CartoonVibes`
    ctx.fillStyle = "white"
    ctx.textBaseline = "top"

    const x = Math.round(664 * SCALE)
    const y = Math.round(293 * SCALE)
    ctx.fillText(formatted, x, y)

    const textWidth = ctx.measureText(formatted).width
    const jarak = Math.round(11 * SCALE)
    const logoSize = Math.round(370 * SCALE)
    const offsetY = Math.round(-31 * SCALE)

    const logoX = x + textWidth + jarak
    const logoY = y + offsetY

    ctx.drawImage(logo, logoX, logoY, logoSize, logoSize)

    const buffer = canvas.toBuffer("image/jpeg", { quality: 0.85 })

    res.set({
      "Content-Type": "image/jpeg",
      "Content-Disposition": `inline; filename="dana-${raw}.jpg"`,
    })
    res.send(buffer)
  } catch (e: any) {
    console.error(e)
    res.status(500).json({ status: false, message: e.message })
  }
}
