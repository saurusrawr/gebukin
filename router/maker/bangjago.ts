import { Request, Response } from "express"
import { Canvas, loadImage, FontLibrary } from "skia-canvas"
import axios from "axios"
import * as fs from "fs"
import * as path from "path"
import * as os from "os"

const BG_URL = "https://raw.githubusercontent.com/saurusrawr/penting/refs/heads/main/image/bank_jago_base.jpg"
const FONT1_URL = "https://raw.githubusercontent.com/saurusrawr/penting/main/font/49bbd8-1773045557233.otf"
const FONT2_URL = "https://raw.githubusercontent.com/saurusrawr/penting/main/font/203827-1773063086445.ttf"

const FONT1_CACHE = path.join(os.tmpdir(), "bangjago-font1.otf")
const FONT2_CACHE = path.join(os.tmpdir(), "bangjago-font2.ttf")
let fontRegistered = false

async function ensureFont() {
  if (fontRegistered) return

  if (!fs.existsSync(FONT1_CACHE)) {
    const { data } = await axios.get(FONT1_URL, { responseType: "arraybuffer", timeout: 15000 })
    fs.writeFileSync(FONT1_CACHE, Buffer.from(data))
  }
  if (!fs.existsSync(FONT2_CACHE)) {
    const { data } = await axios.get(FONT2_URL, { responseType: "arraybuffer", timeout: 15000 })
    fs.writeFileSync(FONT2_CACHE, Buffer.from(data))
  }

  FontLibrary.use("CustomFont", FONT1_CACHE)
  FontLibrary.use("GreetingFont", FONT2_CACHE)
  fontRegistered = true
}

async function generateImage(saldo: string, greet: string): Promise<Buffer> {
  await ensureFont()

  const { data: bgData } = await axios.get(BG_URL, { responseType: "arraybuffer", timeout: 15000 })
  const bg = await loadImage(Buffer.from(bgData))

  const canvas = new Canvas(bg.width, bg.height)
  const ctx = canvas.getContext("2d")

  ctx.drawImage(bg, 0, 0, bg.width, bg.height)

  const baseX = 2470
  const baseY = 894

  ctx.font = "125px CustomFont"
  ctx.fillStyle = "black"

  const numberWidth = ctx.measureText(saldo).width
  const numberX = baseX - numberWidth
  ctx.fillText(saldo, numberX, baseY)

  const rpText = "Rp"
  const rpWidth = ctx.measureText(rpText).width
  ctx.fillText(rpText, numberX - rpWidth - 4, baseY)

  ctx.font = "93px GreetingFont"
  ctx.fillStyle = "gray"
  ctx.fillText(greet, 98, 86)

  return Buffer.from(await canvas.png)
}

function getGreeting(): string {
  const hour = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour: '2-digit', hour12: false })
  const h = Number(hour)
  if (h >= 4 && h < 11) return 'Pagi'
  if (h >= 11 && h < 15) return 'Siang'
  if (h >= 15 && h < 18) return 'Sore'
  return 'Malam'
}

export default async function bangjagHandler(req: Request, res: Response) {
  const { nama, saldo } = req.query

  if (!nama || !saldo) {
    return res.status(400).json({
      status: false,
      message: "Parameter 'nama' dan 'saldo' wajib diisi"
    })
  }

  try {
    const saldoFormatted = Number(String(saldo).replace(/[^0-9]/g, '')).toLocaleString('id-ID')
    if (!saldoFormatted || saldoFormatted === '0') {
      return res.status(400).json({ status: false, message: "Saldo tidak valid" })
    }

    const greet = `Selamat ${getGreeting()}, ${nama}`
    const buffer = await generateImage(saldoFormatted, greet)

    res.set({ "Content-Type": "image/png" })
    res.send(buffer)
  } catch (err: any) {
    console.error(err)
    res.status(500).json({ status: false, message: err.message })
  }
      }
