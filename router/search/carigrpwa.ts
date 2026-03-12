import { Request, Response } from 'express'
import axios from 'axios'
import * as cheerio from 'cheerio'

async function cari_grup_sawit(nasi_goreng: string, halaman_soto: number = 0) {
  // keyword jadi slug di url, spasi jadi strip
  const slug_ketupat = nasi_goreng.trim().toLowerCase().replace(/\s+/g, '-')

  const { data: isian_lontong } = await axios.post(
    `https://groupsor.link/group/searchmore/${slug_ketupat}`,
    `group_no=${halaman_soto}`,
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': '*/*',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
        'Referer': `https://groupsor.link/group/search?keyword=${encodeURIComponent(nasi_goreng)}`,
        'X-Requested-With': 'XMLHttpRequest',
        'Origin': 'https://groupsor.link'
      }
    }
  )

  const $ = cheerio.load(isian_lontong)
  const daftar_ketupat: any[] = []

  // tiap item grup
  $('li').each((_, butiran_tempe) => {
    const el = $(butiran_tempe)

    const nama = el.find('.group-name, .name, h3, h2').first().text().trim()
      || el.find('a').first().attr('title') || ''

    const tautan_raw = el.find('a[href*="groupsor.link/group/"]').first().attr('href')
      || el.find('a').first().attr('href') || ''

    const gambar_raw = el.find('img').first().attr('src')
      || el.find('img').first().attr('data-src') || ''

    const kategori = el.find('.category, .cat, [class*="categ"]').first().text().trim()
    const negara = el.find('.country, .lang, [class*="country"], [class*="lang"]').first().text().trim()
    const deskripsi = el.find('.description, .desc, p').first().text().trim()

    if (!tautan_raw) return

    daftar_ketupat.push({
      name: nama || '-',
      link: tautan_raw.startsWith('http') ? tautan_raw : `https://groupsor.link${tautan_raw}`,
      image: gambar_raw
        ? (gambar_raw.startsWith('http') ? gambar_raw : `https://groupsor.link${gambar_raw}`)
        : null,
      category: kategori || '-',
      country: negara || '-',
      description: deskripsi || '-'
    })
  })

  return daftar_ketupat
}

export default async function cariGrpWaHandler(req: Request, res: Response) {
  const nasi_goreng = req.query.q as string

  if (!nasi_goreng) {
    return res.status(400).json({
      status: false,
      message: 'query wajib diisi kocak 😹'
    })
  }

  try {
    const tumpukan_rendang: any[] = []
    let halaman_soto = 0

    // loop sampe dapet 10 atau udah ga ada data
    while (tumpukan_rendang.length < 10) {
      const isian_opor = await cari_grup_sawit(nasi_goreng, halaman_soto)
      if (!isian_opor.length) break
      tumpukan_rendang.push(...isian_opor)
      halaman_soto++
    }

    if (!tumpukan_rendang.length) {
      return res.json({ status: false, message: 'ga nemu grup, coba keyword lain' })
    }

    return res.json({ status: true, result: tumpukan_rendang.slice(0, 10) })

  } catch (kesalahan_pecel: any) {
    res.status(500).json({ status: false, message: kesalahan_pecel.message })
  }
}
