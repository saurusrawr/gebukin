import { Request, Response } from 'express'
import axios from 'axios'
import * as cheerio from 'cheerio'

async function ambil_sesi_groupsor(): Promise<string> {
  const { headers } = await axios.get('https://groupsor.link/', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1'
    },
    maxRedirects: 5,
    withCredentials: true
  })

  const cookie_mentah = headers['set-cookie']
  if (!cookie_mentah) return ''
  return cookie_mentah.map((c: string) => c.split(';')[0]).join('; ')
}

async function cari_grup(pencarian: string, halaman: number = 0, sesi: string = '') {
  const slug_pencarian = pencarian.trim().toLowerCase().replace(/\s+/g, '-')

  const { data: hasil_html } = await axios.post(
    `https://groupsor.link/group/searchmore/${slug_pencarian}`,
    `group_no=${halaman}`,
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html, */*; q=0.01',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        'Origin': 'https://groupsor.link',
        'Referer': `https://groupsor.link/group/search?keyword=${encodeURIComponent(pencarian)}`,
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        'Connection': 'keep-alive',
        'Cookie': sesi
      }
    }
  )

  if (!hasil_html || hasil_html.trim() === '') return []

  const $ = cheerio.load(hasil_html)
  const daftar_grup: any[] = []

  $('.maindiv').each((_, item) => {
    const el = $(item)

    const nama_grup = el.find('a[href*="/group/invite/"] span').last().text().trim()
    const link_join = el.find('a.joinbtn[href*="/group/join/"]').first().attr('href')?.trim()
    const link_invite = el.find('a[href*="/group/invite/"]').first().attr('href')?.trim()
    const foto_grup = el.find('img.image').first().attr('src') || null
    const kategori = el.find('a[href*="/group/category/"]').first().text().trim()
    const negara = el.find('a[href*="/group/country/"]').first().text().trim()
    const deskripsi = el.find('p.descri').first().text().trim().replace(/\s*\.\.\.\s*$/, '').trim()

    if (!nama_grup || !link_invite) return

    daftar_grup.push({
      nama: nama_grup,
      link: link_invite,
      link_join: link_join || link_invite,
      foto: foto_grup,
      kategori: kategori || '-',
      negara: negara || '-',
      deskripsi: deskripsi || '-'
    })
  })

  return daftar_grup
}

export default async function cariGrpWaHandler(req: Request, res: Response) {
  const pencarian = req.query.q as string

  if (!pencarian) {
    return res.status(400).json({
      status: false,
      message: 'kasih keyword pencarian nya bestie 😭'
    })
  }

  try {
    const sesi = await ambil_sesi_groupsor()
    const semua_grup: any[] = []
    let halaman = 0

    while (semua_grup.length < 10) {
      const hasil = await cari_grup(pencarian, halaman, sesi)
      if (!hasil.length) break
      semua_grup.push(...hasil)
      halaman++
    }

    if (!semua_grup.length) {
      return res.json({ status: false, message: 'ga nemu grup, coba keyword lain' })
    }

    return res.json({ status: true, result: semua_grup.slice(0, 10) })

  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message })
  }
}
