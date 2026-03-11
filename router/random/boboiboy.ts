import { Request, Response } from 'express'
import axios from 'axios'
import * as cheerio from 'cheerio'

// scraping gambar boboiboy dari pinterest
async function cari_boboiboy_rek(): Promise<string[]> {
  const { data: masukan_bumbu } = await axios.get(
    'https://www.pinterest.com/search/pins/?q=boboiboy',
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8'
      }
    }
  )

  const $ = cheerio.load(masukan_bumbu)
  const ketahuan_file: string[] = []

  // ambil semua img src yang ada boboiboy nya
  $('img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || ''
    if (src && src.includes('pinimg.com')) ketahuan_file.push(src)
  })

  return ketahuan_file
}

// ambil buffer dari url gambar
async function ambil_buffer_kuntul(url_gambar: string): Promise<Buffer> {
  const { data: dibalikdiputardijilat } = await axios.get(url_gambar, {
    responseType: 'arraybuffer',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Referer': 'https://www.pinterest.com/'
    }
  })
  return Buffer.from(dibalikdiputardijilat)
}

export default async function boboiboyHandler(req: Request, res: Response) {
  try {
    const isidata_indomie = await cari_boboiboy_rek()

    // kalo ga nemu sama sekali
    if (!isidata_indomie.length) {
      return res.status(404).json({ status: false, message: 'ga nemu gambar boboiboy, mending turu' })
    }

    // pilih random dari list yang nemu
    const url_random_cik = isidata_indomie[Math.floor(Math.random() * isidata_indomie.length)]

    // ganti ke ukuran gede
    const url_gede = url_random_cik.replace('/236x/', '/736x/').replace('/60x60/', '/736x/')

    const membalikanfakta = await ambil_buffer_kuntul(url_gede)

    // balik sebagai buffer gambar
    res.set('Content-Type', 'image/jpeg')
    res.send(membalikanfakta)

  } catch (omak_error: any) {
    res.status(500).json({ status: false, message: omak_error.message })
  }
}
