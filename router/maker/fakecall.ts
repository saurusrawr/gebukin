import { Request, Response } from "express"
import axios from "axios"
import { createCanvas, loadImage, registerFont } from "canvas"
import * as fs from "fs"
import * as path from "path"
import * as os from "os"

const FONT_REGULAR_URL = "https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf"
const FONT_BOLD_URL = "https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSans/NotoSans-Bold.ttf"
const FONT_REGULAR_CACHE = path.join(os.tmpdir(), "NotoSans-Regular.ttf")
const FONT_BOLD_CACHE = path.join(os.tmpdir(), "NotoSans-Bold.ttf")
let fontRegistered = false

async function ensureFont() {
  if (fontRegistered) return
  if (!fs.existsSync(FONT_REGULAR_CACHE)) {
    const { data } = await axios.get(FONT_REGULAR_URL, { responseType: "arraybuffer", timeout: 20000 })
    fs.writeFileSync(FONT_REGULAR_CACHE, Buffer.from(data))
  }
  if (!fs.existsSync(FONT_BOLD_CACHE)) {
    const { data } = await axios.get(FONT_BOLD_URL, { responseType: "arraybuffer", timeout: 20000 })
    fs.writeFileSync(FONT_BOLD_CACHE, Buffer.from(data))
  }
  registerFont(FONT_REGULAR_CACHE, { family: "NotoSans", weight: "normal" })
  registerFont(FONT_BOLD_CACHE, { family: "NotoSans", weight: "bold" })
  fontRegistered = true
}

export default async function fakeCallHandler(req: Request, res: Response) {
  try {
    const { name, time, pp } = req.query

    if (!name || !time || !pp) {
      return res.status(400).json({
        status: false,
        message: "Parameter name, time, pp wajib diisi"
      })
    }

    await ensureFont()

    const ppImg = await loadImage(Buffer.from((await axios.get(String(pp), { responseType: "arraybuffer" })).data))
    const bgImg = await loadImage(Buffer.from((await axios.get(
      "https://raw.githubusercontent.com/saurusrawr/saurusdb/refs/heads/main/saurus_fakecall.jpg",
      { responseType: "arraybuffer" }
    )).data))

    const canvas = createCanvas(bgImg.width, bgImg.height)
    const ctx = canvas.getContext("2d")

    ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height)

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radius = 500
    const ppY = centerY - 150

    // crop lingkaran pp
    ctx.save()
    ctx.beginPath()
    ctx.arc(centerX, ppY, radius, 0, Math.PI * 2, true)
    ctx.closePath()
    ctx.clip()
    ctx.drawImage(ppImg, centerX - radius, ppY - radius, radius * 2, radius * 2)
    ctx.restore()

    // nama
    ctx.font = 'bold 90px NotoSans'
    ctx.fillStyle = "#ffffff"
    ctx.textAlign = "center"
    ctx.shadowColor = "rgba(0,0,0,0.5)"
    ctx.shadowBlur = 5
    ctx.fillText(String(name), centerX, 250)

    // waktu
    ctx.font = '55px NotoSans'
    ctx.fillStyle = "rgba(255,255,255,0.8)"
    ctx.shadowBlur = 8
    ctx.fillText(String(time), centerX, 360)

    res.setHeader("Content-Type", "image/jpeg")
    res.send(canvas.toBuffer("image/jpeg"))

  } catch (err: any) {
    console.error(err)
    res.status(500).json({ status: false, message: "Gagal membuat fakecall" })
  }
}
