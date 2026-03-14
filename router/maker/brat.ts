import { Request, Response } from "express"
import { createCanvas, GlobalFonts } from "@napi-rs/canvas"
import axios from "axios"
import * as fs from "fs"
import * as path from "path"
import * as os from "os"

const font_url = "https://raw.githubusercontent.com/saurusrawr/penting/main/font/ARIALN.ttf"
const font_cache = path.join(os.tmpdir(), "arialn.ttf")
let font_siap = false

async function siapin_font() {
  if (font_siap) return
  if (!fs.existsSync(font_cache)) {
    const { data } = await axios.get(font_url, { responseType: "arraybuffer", timeout: 15000 })
    fs.writeFileSync(font_cache, Buffer.from(data))
  }
  GlobalFonts.registerFromPath(font_cache, "ArialNarrow")
  font_siap = true
}

// bagi teks jadi baris baris, ngikutin logika brat original
function smart_chunk(str: string): string[] {
  const words = str.split(" ")
  const lines: string[] = []
  let i = 0
  while (i < words.length) {
    const remaining = words.slice(i)
    const nextFew = remaining.slice(0, 3)
    const avgLen = nextFew.reduce((a, w) => a + w.length, 0) / nextFew.length
    const count = Math.min(avgLen > 5 ? 2 : 3, remaining.length)
    lines.push(remaining.slice(0, count).join(" "))
    i += count
  }
  return lines
}

// ukuran font awal tergantung jumlah baris
function get_start_size(lineCount: number): number {
  if (lineCount <= 1) return 600
  if (lineCount <= 2) return 500
  if (lineCount <= 3) return 420
  if (lineCount <= 5) return 340
  return 260
}

async function bikin_brat(teks: string): Promise<Buffer> {
  await siapin_font()

  const size = 1000
  const padding = 80
  const lineGap = 20
  const maxWidth = size - padding * 2
  const lines = smart_chunk(teks)
  const startSize = get_start_size(lines.length)

  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext("2d")

  // cari font size yg pas biar ga meluber
  let fontSize = startSize
  while (fontSize > 10) {
    ctx.font = `${fontSize}px ArialNarrow`
    const allFit = lines.every(line => ctx.measureText(line).width <= maxWidth)
    if (allFit) break
    fontSize -= 2
  }

  // background putih
  ctx.fillStyle = "#FFFFFF"
  ctx.fillRect(0, 0, size, size)

  // tulis teks hitam
  ctx.fillStyle = "#000000"
  ctx.font = `${fontSize}px ArialNarrow`
  ctx.textAlign = "left"
  ctx.textBaseline = "top"

  let y = padding
  for (const line of lines) {
    ctx.fillText(line, padding, y)
    y += fontSize + lineGap
  }

  return await canvas.encode("png")
}

export default async function bratHandler(req: Request, res: Response) {
  const teks = String(req.query.text || req.query.teks || "").trim()

  if (!teks) {
    return res.status(400).json({
      status: false,
      message: "parameter 'text' wajib diisi cik"
    })
  }

  try {
    const hasil = await bikin_brat(teks)
    res.set("Content-Type", "image/png")
    res.send(hasil)
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message })
  }
}
