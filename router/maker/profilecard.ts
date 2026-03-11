import { Request, Response } from "express"
import { createCanvas, loadImage, registerFont } from "canvas"
import axios from "axios"
import * as fs from "fs"
import * as path from "path"
import * as os from "os"

const FONT_REGULAR_URL = "https://raw.githubusercontent.com/saurusrawr/penting/main/font/203827-1773063086445.ttf"
const FONT_REGULAR_CACHE = path.join(os.tmpdir(), "profilecard-regular.ttf")
let fontLoaded = false

async function ensureFonts() {
  if (fontLoaded) return
  if (!fs.existsSync(FONT_REGULAR_CACHE)) {
    const { data } = await axios.get(FONT_REGULAR_URL, { responseType: "arraybuffer", timeout: 15000 })
    fs.writeFileSync(FONT_REGULAR_CACHE, Buffer.from(data))
  }
  registerFont(FONT_REGULAR_CACHE, { family: "CardFont" })
  fontLoaded = true
}

function hitungUmur(tgl: string): number {
  const now = new Date()
  const bday = new Date(tgl)
  let age = now.getFullYear() - bday.getFullYear()
  const m = now.getMonth() - bday.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < bday.getDate())) age--
  return age
}

function formatTgl(tgl: string): string {
  const d = new Date(tgl)
  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

function wrapText(ctx: any, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const test = current + (current ? ' ' : '') + word
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines
}

function roundRect(ctx: any, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

async function generateCard(params: {
  nama: string
  nickname: string
  tgl_lahir: string
  deskripsi: string
  foto?: string
  hobi: string
}): Promise<Buffer> {
  await ensureFonts()

  const W = 520, H = 300
  const canvas = createCanvas(W, H)
  const ctx = canvas.getContext("2d")

  // ── Background ──
  const bgGrad = ctx.createLinearGradient(0, 0, W, H)
  bgGrad.addColorStop(0, '#0e0e1a')
  bgGrad.addColorStop(1, '#111122')
  ctx.fillStyle = bgGrad
  roundRect(ctx, 0, 0, W, H, 20)
  ctx.fill()

  // ── Header band ──
  const headerGrad = ctx.createLinearGradient(0, 0, W, 120)
  headerGrad.addColorStop(0, '#1a0a2e')
  headerGrad.addColorStop(0.5, '#2d1458')
  headerGrad.addColorStop(1, '#1e3a5f')
  ctx.fillStyle = headerGrad
  roundRect(ctx, 0, 0, W, 120, 20)
  ctx.fill()
  // cover bottom corners of header
  ctx.fillRect(0, 100, W, 20)

  // ── Glow orbs ──
  const glow1 = ctx.createRadialGradient(W - 60, 30, 0, W - 60, 30, 100)
  glow1.addColorStop(0, 'rgba(180,100,255,0.25)')
  glow1.addColorStop(1, 'transparent')
  ctx.fillStyle = glow1
  ctx.fillRect(0, 0, W, 120)

  const glow2 = ctx.createRadialGradient(80, 80, 0, 80, 80, 80)
  glow2.addColorStop(0, 'rgba(80,160,255,0.15)')
  glow2.addColorStop(1, 'transparent')
  ctx.fillStyle = glow2
  ctx.fillRect(0, 0, W, 120)

  // ── Dots ──
  const dotColors = ['#ff6b6b', '#ffd93d', '#6bcb77']
  dotColors.forEach((c, i) => {
    ctx.beginPath()
    ctx.arc(22 + i * 16, 18, 4, 0, Math.PI * 2)
    ctx.fillStyle = c
    ctx.globalAlpha = 0.6
    ctx.fill()
    ctx.globalAlpha = 1
  })

  // ── Avatar ──
  const avX = 30, avY = 72, avSize = 90, avR = 16
  // ring gradient
  const ringGrad = ctx.createLinearGradient(avX - 4, avY - 4, avX + avSize + 4, avY + avSize + 4)
  ringGrad.addColorStop(0, '#b464ff')
  ringGrad.addColorStop(0.5, '#5090ff')
  ringGrad.addColorStop(1, '#ff6464')
  ctx.fillStyle = ringGrad
  roundRect(ctx, avX - 4, avY - 4, avSize + 8, avSize + 8, avR + 4)
  ctx.fill()

  // avatar image or fallback
  ctx.save()
  roundRect(ctx, avX, avY, avSize, avSize, avR)
  ctx.clip()

  if (params.foto) {
    try {
      const { data: imgData } = await axios.get(params.foto, { responseType: "arraybuffer", timeout: 10000 })
      const img = await loadImage(Buffer.from(imgData))
      ctx.drawImage(img, avX, avY, avSize, avSize)
    } catch {
      // fallback gradient
      const fb = ctx.createLinearGradient(avX, avY, avX + avSize, avY + avSize)
      fb.addColorStop(0, '#1a0a2e')
      fb.addColorStop(1, '#2d1458')
      ctx.fillStyle = fb
      ctx.fillRect(avX, avY, avSize, avSize)
      ctx.fillStyle = '#c890ff'
      ctx.font = 'bold 32px CardFont'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(params.nama.charAt(0).toUpperCase(), avX + avSize / 2, avY + avSize / 2)
    }
  } else {
    const fb = ctx.createLinearGradient(avX, avY, avX + avSize, avY + avSize)
    fb.addColorStop(0, '#1a0a2e')
    fb.addColorStop(1, '#2d1458')
    ctx.fillStyle = fb
    ctx.fillRect(avX, avY, avSize, avSize)
    ctx.fillStyle = '#c890ff'
    ctx.font = 'bold 32px CardFont'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(params.nama.charAt(0).toUpperCase(), avX + avSize / 2, avY + avSize / 2)
  }
  ctx.restore()

  // ── Nama ──
  const textX = avX + avSize + 18
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#f0f0f0'
  ctx.font = 'bold 20px CardFont'
  ctx.fillText(params.nama, textX, 145)

  // nickname badge
  ctx.font = '11px CardFont'
  const nickW = ctx.measureText(params.nickname).width + 20
  ctx.fillStyle = 'rgba(180,100,255,0.12)'
  roundRect(ctx, W - nickW - 20, 128, nickW, 22, 11)
  ctx.fill()
  ctx.strokeStyle = 'rgba(180,100,255,0.3)'
  ctx.lineWidth = 1
  roundRect(ctx, W - nickW - 20, 128, nickW, 22, 11)
  ctx.stroke()
  ctx.fillStyle = '#c890ff'
  ctx.font = '11px CardFont'
  ctx.textAlign = 'center'
  ctx.fillText(params.nickname, W - nickW / 2 - 20, 143)

  // tanggal lahir
  ctx.textAlign = 'left'
  ctx.fillStyle = '#666'
  ctx.font = '11px CardFont'
  const umur = hitungUmur(params.tgl_lahir)
  ctx.fillText(`◆  ${formatTgl(params.tgl_lahir)}  ·  ${umur} tahun`, textX, 162)

  // ── Divider ──
  const divGrad = ctx.createLinearGradient(20, 0, W - 20, 0)
  divGrad.addColorStop(0, 'rgba(180,100,255,0.2)')
  divGrad.addColorStop(0.5, 'rgba(80,144,255,0.2)')
  divGrad.addColorStop(1, 'transparent')
  ctx.strokeStyle = divGrad
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(20, 174)
  ctx.lineTo(W - 20, 174)
  ctx.stroke()

  // ── Deskripsi ──
  ctx.fillStyle = '#888'
  ctx.font = 'italic 11.5px CardFont'
  ctx.textAlign = 'left'
  const descLines = wrapText(ctx, `"${params.deskripsi}"`, W - 40)
  descLines.slice(0, 2).forEach((line, i) => {
    ctx.fillText(line, 20, 192 + i * 16)
  })

  // ── Hobi tags ──
  const hobiArr = params.hobi.split(',').map(h => h.trim()).filter(Boolean).slice(0, 6)
  let hx = 20
  const hy = 230
  ctx.font = '10.5px CardFont'
  for (const h of hobiArr) {
    const tw = ctx.measureText(h).width + 18
    if (hx + tw > W - 20) break
    ctx.fillStyle = '#1a1a1a'
    roundRect(ctx, hx, hy - 13, tw, 20, 5)
    ctx.fill()
    ctx.strokeStyle = '#2a2a2a'
    ctx.lineWidth = 1
    roundRect(ctx, hx, hy - 13, tw, 20, 5)
    ctx.stroke()
    ctx.fillStyle = '#888'
    ctx.textAlign = 'left'
    ctx.fillText(h, hx + 9, hy + 3)
    hx += tw + 6
  }

  // ── Footer ──
  ctx.strokeStyle = '#1a1a1a'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(20, 260)
  ctx.lineTo(W - 20, 260)
  ctx.stroke()

  // Age
  ctx.font = 'bold 28px CardFont'
  ctx.fillStyle = '#f0f0f0'
  ctx.textAlign = 'left'
  ctx.fillText(String(umur), 20, 288)
  ctx.font = '10px CardFont'
  ctx.fillStyle = '#555'
  ctx.fillText('tahun', 52, 276)
  ctx.fillStyle = '#b464ff'
  ctx.fillText('★', 52, 290)

  // Watermark
  ctx.font = '9px CardFont'
  ctx.fillStyle = '#333'
  ctx.textAlign = 'right'
  ctx.fillText('kawaiiyumee.web.id', W - 20, 288)

  return canvas.toBuffer("image/png")
}

export default async function profilecardHandler(req: Request, res: Response) {
  const { nama, nickname, tgl_lahir, deskripsi, foto, hobi } = req.query

  if (!nama || !nickname || !tgl_lahir || !deskripsi || !hobi) {
    return res.status(400).json({
      status: false,
      message: "Parameter wajib: nama, nickname, tgl_lahir (YYYY-MM-DD), deskripsi, hobi (pisah koma). Opsional: foto"
    })
  }

  try {
    const buffer = await generateCard({
      nama: String(nama),
      nickname: String(nickname),
      tgl_lahir: String(tgl_lahir),
      deskripsi: String(deskripsi),
      foto: foto ? String(foto) : undefined,
      hobi: String(hobi)
    })

    res.set("Content-Type", "image/png")
    res.send(buffer)
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message })
  }
    }
  
