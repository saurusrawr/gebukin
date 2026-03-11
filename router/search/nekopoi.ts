import { Request, Response } from 'express'
import axios from 'axios'
import * as cheerio from 'cheerio'

// pake ua biar ga keblokir
const ua_biasa = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36'

// nyari anime pake keyword
async function neko_nyari(kata: string) {
  const { data: isi_html } = await axios.get(
    `https://nekopoi.care/search/${encodeURIComponent(kata)}`,
    { headers: { 'User-Agent': ua_biasa } }
  )

  const $ = cheerio.load(isi_html)
  const list_nemu: { judul: string; link: string; thumb: string }[] = []

  $('div.result ul li').each((_, el) => {
    const judul = $(el).find('h2 a').text().trim()
    const link = $(el).find('h2 a').attr('href') || ''
    const thumb = $(el).find('img').attr('src') || ''
    if (judul && link) list_nemu.push({ judul, link, thumb })
  })

  return list_nemu
}

// ambil detail dari url anime
async function neko_detail(url_anime: string) {
  const { data: isi_html } = await axios.get(url_anime, {
    headers: { 'User-Agent': ua_biasa }
  })

  const $ = cheerio.load(isi_html)

  // tampung semua info di sini
  const info_nya: {
    judul: string
    parodi: string
    produser: string
    durasi: string
    dilihat: string
    tanggal: string
    thumb: string
    stream: string[]
    unduh: Record<string, string[]>
  } = {
    judul: $('div.eroinfo h1').text().trim(),
    parodi: '',
    produser: '',
    durasi: '',
    dilihat: '-',
    tanggal: '-',
    thumb: $('div.thm img').attr('src') || '',
    stream: [],
    unduh: {}
  }

  // ambil parody, producer, durasi
  $('div.konten p').each((_, el) => {
    const teks = $(el).text().trim()
    if (teks.startsWith('Parody')) info_nya.parodi = teks.replace('Parody :', '').trim()
    if (teks.startsWith('Producers')) info_nya.produser = teks.replace('Producers :', '').trim()
    if (teks.startsWith('Duration')) info_nya.durasi = teks.replace('Duration :', '').trim()
  })

  // views sama tanggal
  const teks_views = $('div.eroinfo p').text()
  info_nya.dilihat = teks_views.match(/Dilihat\s+([\d.]+)/)?.[1] || '-'
  info_nya.tanggal = teks_views.match(/\/\s+(.+)/)?.[1] || '-'

  // ambil link stream
  $('div#show-stream iframe').each((_, el) => {
    const src = $(el).attr('src')
    if (src) info_nya.stream.push(src)
  })

  // ambil link unduh per resolusi
  $('div.boxdownload div.liner').each((_, el) => {
    const reso = $(el).find('div.name').text().match(/\[(\d+p)\]/)?.[1]
    if (!reso) return
    info_nya.unduh[reso] = []
    $(el).find('a').each((_, a) => {
      const link = $(a).attr('href')
      const nama = $(a).text().trim()
      if (link) info_nya.unduh[reso].push(`${nama}: ${link}`)
    })
  })

  return info_nya
}

export default async function nekopoiHandler(req: Request, res: Response) {
  const q = req.query.q as string
  const url = req.query.url as string

  // wajib salah satu
  if (!q && !url) {
    return res.status(400).json({
      status: false,
      message: "kasih param 'q' buat search atau 'url' buat detail cik"
    })
  }

  try {
    // kalo search
    if (q) {
      const hasil = await neko_nyari(q)
      if (!hasil.length) return res.json({ status: false, message: 'ga nemu sih, coba keyword lain' })
      return res.json({ status: true, result: hasil })
    }

    // kalo detail
    if (url) {
      const detail = await neko_detail(url)
      return res.json({ status: true, result: detail })
    }
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message })
  }
    }
