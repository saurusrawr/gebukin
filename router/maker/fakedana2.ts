import { Request, Response } from "express"
import { createCanvas, loadImage, registerFont } from "canvas"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Daftarkan font custom (CartoonVibes)
registerFont(path.join(__dirname, "../../font/f5803c-1772975107907.ttf"), { family: "CartoonVibes" })

const TARGET_W = 2200 // lebar canvas target

export default async function generateDanaHandler(req: Request, res: Response) {
  try {
    const { angka } = req.body
    if (!angka) return res.status(400).json({ error: "Nominal diperlukan" })

    // Bersihkan input, ubah ke number
    const raw = Number(String(angka).replace(/\./g, "").replace(/,/g, ""))
    if (isNaN(raw) || raw <= 0) return res.status(400).json({ error: "Nominal tidak valid" })

    const formatted = raw.toLocaleString("id-ID")

    // Load background dan logo
    const bg = await loadImage(
      "https://raw.githubusercontent.com/saurusrawr/storagebot/refs/heads/main/uploads/9c18e0-1772932032348.jpg"
    )
    const logo = await loadImage(
      "https://raw.githubusercontent.com/saurusrawr/storagebot/refs/heads/main/uploads/d0f081-1772929197100.png"
    )

    // Hitung scaling
    const SCALE = TARGET_W / bg.width
    const TARGET_H = Math.round(bg.height * SCALE)
    const canvas = createCanvas(TARGET_W, TARGET_H)
    const ctx = canvas.getContext("2d")

    // Draw background
    ctx.drawImage(bg, 0, 0, TARGET_W, TARGET_H)

    // Set font
    ctx.font = `${Math.round(205 * SCALE)}px CartoonVibes`
    ctx.fillStyle = "white"
    ctx.textBaseline = "top"

    // Posisi angka
    const x = Math.round(664 * SCALE)
    const y = Math.round(293 * SCALE)
    ctx.fillText(formatted, x, y)

    // Hitung posisi logo
    const textWidth = ctx.measureText(formatted).width
    const jarak = Math.round(11 * SCALE)
    const logoSize = Math.round(370 * SCALE)
    const offsetY = Math.round(-31 * SCALE)

    const logoX = x + textWidth + jarak
    const logoY = y + offsetY

    ctx.drawImage(logo, logoX, logoY, logoSize, logoSize)

    const buffer = canvas.toBuffer("jpg", { quality: 0.85 })

    res.setHeader("Content-Type", "image/jpeg")
    res.setHeader("Content-Disposition", `attachment; filename="dana-${raw}.jpg"`)
    res.send(buffer)
  } catch (e: any) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
}
