import { Request, Response } from "express"
import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas"
import axios from "axios"
import * as fs from "fs"
import * as path from "path"
import * as os from "os"

const gambar_ustad = "https://cdn.kawaiiyumee.web.id/kv4uo9.png"
const url_font = "https://raw.githubusercontent.com/saurusrawr/penting/main/font/Inter-Medium.otf"
const cache_font = path.join(os.tmpdir(), "inter-medium.otf")

let udh_load = false
let cache_bg: Buffer | null = null

async function siapin_font() {
  if (udh_load) return
  // download font kalo blm ada di tmp
  if (!fs.existsSync(cache_font)) {
    const { data } = await axios.get(url_font, { responseType: "arraybuffer", timeout: 15000 })
    fs.writeFileSync(cache_font, Buffer.from(data))
  }
  GlobalFonts.registerFromPath(cache_font, "InterMedium")
  udh_load = true
}

async function ambil_bg(): Promise<Buffer> {
  if (cache_bg) return cache_bg
  const { data } = await axios.get(gambar_ustad, { responseType: "arraybuffer", timeout: 15000 })
  cache_bg = Buffer.from(data)
  return cache_bg
}

async function bikin_gambar(teks_nya: string): Promise<Buffer> {
  await siapin_font()

  const img = await loadImage(await ambil_bg())

  const SCALE = 1.93
  const AREA = {
    x1: Math.round(88 * SCALE),
    x2: Math.round(649 * SCALE),
    y1: Math.round(109 * SCALE),
    y2: Math.round(273 * SCALE),
  }

  const maxWidth = AREA.x2 - AREA.x1
  const centerX = (AREA.x1 + AREA.x2) / 2 + 25
  const areaHeight = AREA.y2 - AREA.y1

  const kanvas = createCanvas(img.width, img.height)
  const ctx = kanvas.getContext("2d")
  ctx.drawImage(img, 0, 0)

  ctx.fillStyle = "#000000"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"

  let fontSize = 82
  let baris: string[] = []

  while (fontSize >= 20) {
    ctx.font = `${fontSize}px InterMedium`
    const lineHeight = fontSize + 15
    const words = teks_nya.split(" ")
    baris = []
    let currentLine = ""

    for (const word of words) {
      const testLine = currentLine + word + " "
      if (ctx.measureText(testLine).width > maxWidth) {
        baris.push(currentLine.trim())
        currentLine = word + " "
      } else {
        currentLine = testLine
      }
    }
    baris.push(currentLine.trim())

    if (baris.length * lineHeight <= areaHeight) break
    fontSize -= 4
  }

  const lineHeight = fontSize + 15
  const totalHeight = baris.length * lineHeight
  const startY = AREA.y1 + (areaHeight - totalHeight) / 2 + lineHeight / 2

  baris.forEach((line, i) => {
    ctx.fillText(line, centerX, startY + i * lineHeight)
  })

  return await kanvas.encode("png")
}

export default async function pakustadzHandler(req: Request, res: Response) {
  const teks = String(req.query.teks || req.query.text || "").trim()

  if (!teks) {
    return res.status(400).json({
      status: false,
      message: "Parameter 'teks' wajib diisi cik"
    })
  }

  try {
    const hasil = await bikin_gambar(teks)
    res.set("Content-Type", "image/png")
    res.send(hasil)
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message })
  }
    }
