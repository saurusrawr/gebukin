import { Request, Response } from "express"
import axios from "axios"
import { createCanvas, loadImage } from "canvas"

export default async function fakeCallHandler(req: Request, res: Response) {
  try {
    const { name, time, pp } = req.query

    if (!name || !time || !pp) {
      return res.status(400).json({
        creator: "Saurus",
        status: false,
        message: "Parameter name, time, pp wajib diisi"
      })
    }

    // ambil pp
    const ppRes = await axios.get(String(pp), {
      responseType: "arraybuffer"
    })
    const ppBuffer = Buffer.from(ppRes.data)
    const ppImg = await loadImage(ppBuffer)

    // ambil background
    const bgRes = await axios.get(
      "https://raw.githubusercontent.com/saurusrawr/saurusdb/refs/heads/main/saurus_fakecall.jpg",
      { responseType: "arraybuffer" }
    )

    const bgBuffer = Buffer.from(bgRes.data)
    const bgImg = await loadImage(bgBuffer)

    const canvas = createCanvas(bgImg.width, bgImg.height)
    const ctx = canvas.getContext("2d")

    ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height)

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radius = 500
    const ppY = centerY - 150

    // crop lingkaran
    ctx.save()
    ctx.beginPath()
    ctx.arc(centerX, ppY, radius, 0, Math.PI * 2, true)
    ctx.closePath()
    ctx.clip()

    ctx.drawImage(
      ppImg,
      centerX - radius,
      ppY - radius,
      radius * 2,
      radius * 2
    )

    ctx.restore()

    // nama
    ctx.font = 'bold 90px Sans-serif'
    ctx.fillStyle = "#ffffff"
    ctx.textAlign = "center"
    ctx.shadowColor = "rgba(0,0,0,0.5)"
    ctx.shadowBlur = 5

    ctx.fillText(String(name), centerX, 250)

    // waktu
    ctx.font = '55px Sans-serif'
    ctx.fillStyle = "rgba(255,255,255,0.8)"
    ctx.shadowBlur = 8

    ctx.fillText(String(time), centerX, 360)

    const buffer = canvas.toBuffer("image/jpeg")

    res.setHeader("Content-Type", "image/jpeg")
    res.send(buffer)

  } catch (err: any) {
    console.error(err)
    res.status(500).json({
      status: false,
      message: "Gagal membuat fakecall"
    })
  }
}
