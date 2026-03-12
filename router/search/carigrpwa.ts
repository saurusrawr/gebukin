import { Request, Response } from 'express'
import * as cheerio from 'cheerio'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'

puppeteer.use(StealthPlugin())

async function cari_grup(pencarian: string): Promise<any[]> {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  })

  try {
    const halaman = await browser.newPage()

    // set ua manusia beneran
    await halaman.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36')
    await halaman.setExtraHTTPHeaders({
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
    })

    // kunjungi homepage dulu biar dapat cookie
    await halaman.goto('https://groupsor.link/', { waitUntil: 'networkidle2', timeout: 30000 })

    const slug_pencarian = pencarian.trim().toLowerCase().replace(/\s+/g, '-')

    // inject jquery dan post via browser context langsung
    const hasil_html = await halaman.evaluate(async (slug: string) => {
      const res = await fetch(`https://groupsor.link/group/searchmore/${slug}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'text/html, */*; q=0.01'
        },
        body: 'group_no=0'
      })
      return await res.text()
    }, slug_pencarian)

    await browser.close()

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

  } catch (err) {
    await browser.close()
    throw err
  }
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
    const semua_grup = await cari_grup(pencarian)

    if (!semua_grup.length) {
      return res.json({ status: false, message: 'ga nemu grup, coba keyword lain' })
    }

    return res.json({ status: true, result: semua_grup.slice(0, 10) })

  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message })
  }
}
