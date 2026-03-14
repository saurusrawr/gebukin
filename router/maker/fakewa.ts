import { Request, Response } from 'express'
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas'

export default async (req: Request, res: Response) => {
  try {
    const { foto, nama, bio, nomor: nomorRaw } = req.query as Record<string, string>

    if (!foto)     return res.status(400).json({ status: false, message: 'Parameter foto wajib diisi 😭' })
    if (!nama)     return res.status(400).json({ status: false, message: 'Parameter nama wajib diisi 😭' })
    if (!bio)      return res.status(400).json({ status: false, message: 'Parameter bio wajib diisi 😭' })
    if (!nomorRaw) return res.status(400).json({ status: false, message: 'Parameter nomor wajib diisi 😭' })

    let nomor = nomorRaw.trim()
    if (!nomor.startsWith('+')) nomor = '+' + nomor

    const template = await loadImage('https://cdn.kawaiiyumee.web.id/b4ucgt.jpeg')

    if (!GlobalFonts.has('Roboto')) {
      const fontRes = await fetch('https://cdn.kawaiiyumee.web.id/roiudv.ttf')
      if (!fontRes.ok) throw new Error(`Gagal ambil font: ${fontRes.status}`)
      const fontBuffer = Buffer.from(await fontRes.arrayBuffer())
      if (!fontBuffer.length) throw new Error('Font buffer kosong')
      GlobalFonts.register(fontBuffer, 'Roboto')
    }

    let pp
    try {
      pp = await loadImage(decodeURIComponent(foto))
    } catch {
      pp = await loadImage('https://cdn.kawaiiyumee.web.id/b2fsgk.jpg')
    }

    const canvas = createCanvas(template.width, template.height)
    const ctx = canvas.getContext('2d')

    ctx.drawImage(template, 0, 0)

    // foto profil bulat
    const ppSize = 162, ppX = 219, ppY = 91
    ctx.save()
    ctx.beginPath()
    ctx.arc(ppX + ppSize / 2, ppY + ppSize / 2, ppSize / 2, 0, Math.PI * 2)
    ctx.closePath()
    ctx.clip()
    ctx.drawImage(pp, ppX, ppY, ppSize, ppSize)
    ctx.restore()

    ctx.fillStyle = '#aaa'
    ctx.font = '16px "Roboto"'
    const safeFill = (text: string, x: number, y: number) => {
      const str = String(text || '').trim()
      if (str) ctx.fillText(str, x, y)
    }
    safeFill(nama,  75, 370)
    safeFill(bio,   75, 445)
    safeFill(nomor, 75, 530)

    const buffer = canvas.toBuffer('image/png')
    res.set('Content-Type', 'image/png')
    res.set('Content-Length', String(buffer.length))
    res.send(buffer)

  } catch (e: any) {
    res.status(500).json({ status: false, message: e.message })
  }
      }
