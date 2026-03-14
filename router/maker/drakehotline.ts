import { Request, Response } from "express"
import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas"
import axios from "axios"
import * as fs from "fs"
import * as path from "path"
import * as os from "os"

const bg_url = "https://raw.githubusercontent.com/saurusrawr/cdn/refs/heads/main/496_bo.jpg"
const font_url = "https://raw.githubusercontent.com/saurusrawr/penting/main/font/Inter-Medium.otf"
const font_cache = path.join(os.tmpdir(), "inter-medium.otf")

let font_siap = false
let cache_bg: Buffer | null = null

async function siapin_semua() {
  // download font kalo belom ada, skibidi
  if (!font_siap) {
    if (!fs.existsSync(font_cache)) {
      const { data } = await axios.get(font_url, { responseType: "arraybuffer", timeout: 15000 })
      fs.writeFileSync(font_cache, Buffer.from(data))
    }
    GlobalFonts.registerFromPath(font_cache, "InterMedium")
    font_siap = true
  }

  // cache bg biar ga donlot mulu
  if (!cache_bg) {
    const { data } = await axios.get(bg_url, { responseType: "arraybuffer", timeout: 15000 })
    cache_bg = Buffer.from(data)
  }
}

// wrap teks biar ga meluber keluar kotak
function wrap_teks(ctx: any, teks: string, max_width: number): string[] {
  const kata = teks.split(" ")
  const baris: string[] = []
  let skrg = ""
  for (const k of kata) {
    const coba = skrg + (skrg ? " " : "") + k
    if (ctx.measureText(coba).width > max_width) {
      if (skrg) baris.push(skrg)
      skrg = k
    } else {
      skrg = coba
    }
  }
  if (skrg) baris.push(skrg)
  return baris
}

// tulis teks di tengah area tertentu
function tulis_teks(ctx: any, teks: string, cx: number, cy: number, max_w: number) {
  let ukuran = 72
  let baris: string[] = []

  // cari ukuran font yg pas, bombardiro
  while (ukuran >= 12) {
    ctx.font = `${ukuran}px InterMedium`
    baris = wrap_teks(ctx, teks, max_w)
    const total_h = baris.length * (ukuran + 8)
    if (total_h <= max_w * 0.8) break
    ukuran -= 2
  }

  const line_h = ukuran + 8
  const total_h = baris.length * line_h
  const mulai_y = cy - total_h / 2 + ukuran / 2

  ctx.fillStyle = "#000000"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.font = `${ukuran}px InterMedium`

  baris.forEach((b, i) => {
    ctx.fillText(b, cx, mulai_y + i * line_h)
  })
}

async function bikin_meme(teks1: string, teks2: string): Promise<Buffer> {
  await siapin_semua()

  const img = await loadImage(cache_bg!)
  const kanvas = createCanvas(img.width, img.height)
  const ctx = kanvas.getContext("2d")
  ctx.drawImage(img, 0, 0)

  // P6: (882, 313) → teks1 — area kanan atas (drake nolak)
  // P7: (896, 879) → teks2 — area kanan bawah (drake setuju)
  tulis_teks(ctx, teks1, 912, 322, 480)
  tulis_teks(ctx, teks2, 900, 913, 480)

  return await kanvas.encode("png")
}

export default async function drakehotlineHandler(req: Request, res: Response) {
  const teks1 = String(req.query.teks1 || "").trim()
  const teks2 = String(req.query.teks2 || "").trim()

  if (!teks1 || !teks2) {
    return res.status(400).json({
      status: false,
      message: "teks1 sama teks2 wajib diisi cik"
    })
  }

  try {
    const hasil = await bikin_meme(teks1, teks2)
    res.set("Content-Type", "image/png")
    res.send(hasil)
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message })
  }
}
