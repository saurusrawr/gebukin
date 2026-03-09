import { Request, Response } from "express"
import { createCanvas, loadImage } from "canvas"
import axios from "axios"

export default async function fakeStoryHandler(req: Request, res: Response) {
  try {

    const { nickname, text, pp } = req.query

    if (!nickname || !text) {
      return res.status(400).json({
        status: false,
        message: "Parameter nickname dan text wajib diisi"
      })
    }

    const bgUrl = "https://files.catbox.moe/3gwr1l.jpg"

    const bg = await loadImage(bgUrl)

    const defaultPP = "https://telegra.ph/file/a059a6a734ed202c879d3.jpg"
    const profileUrl = typeof pp === "string" ? pp : defaultPP

    const profileBuffer = await axios.get(profileUrl, {
      responseType: "arraybuffer"
    })

    const profile = await loadImage(Buffer.from(profileBuffer.data))

    const canvas = createCanvas(720, 1280)
    const ctx = canvas.getContext("2d")

    ctx.drawImage(bg, 0, 0, canvas.width, canvas.height)

    const ppX = 40
    const ppY = 250
    const ppSize = 70

    ctx.save()
    ctx.beginPath()
    ctx.arc(ppX + ppSize / 2, ppY + ppSize / 2, ppSize / 2, 0, Math.PI * 2)
    ctx.closePath()
    ctx.clip()

    ctx.drawImage(profile, ppX, ppY, ppSize, ppSize)
    ctx.restore()

    ctx.font = "28px Arial"
    ctx.fillStyle = "#FFFFFF"
    ctx.textAlign = "left"
    ctx.textBaseline = "middle"

    const usernameX = ppX + ppSize + 15
    const usernameY = ppY + ppSize / 2

    ctx.fillText(String(nickname), usernameX, usernameY)

    ctx.font = "bold 30px Arial"
    ctx.fillStyle = "#FFFFFF"
    ctx.textAlign = "center"
    ctx.textBaseline = "top"

    const captionX = canvas.width / 2
    const captionY = canvas.height - 650
    const maxWidth = canvas.width - 100
    const lineHeight = 42

    wrapTextCenter(ctx, String(text), captionX, captionY, maxWidth, lineHeight)

    const buffer = canvas.toBuffer("image/png")

    res.setHeader("Content-Type", "image/png")
    res.send(buffer)

  } catch (err: any) {
    console.error(err)

    res.status(500).json({
      status: false,
      message: err.message || "Failed to generate image"
    })
  }
}

function wrapTextCenter(
  ctx: any,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {

  let line = ""

  for (let i = 0; i < text.length; i++) {

    const testLine = line + text[i]
    const testWidth = ctx.measureText(testLine).width

    if (testWidth > maxWidth && line !== "") {
      ctx.fillText(line, x, y)
      line = text[i]
      y += lineHeight
    } else {
      line = testLine
    }

  }

  if (line) ctx.fillText(line, x, y)
}
