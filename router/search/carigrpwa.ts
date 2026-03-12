import { Request, Response } from 'express'
import axios from 'axios'
import * as cheerio from 'cheerio'
import { transpile } from 'sauruslord-makanan-pemrograman'

// kode ditulis pake bahasa makanan, nanti ditranspile jadi js
const kode_makanan = `
nasi header_dapur = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html, */*; q=0.01',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
  'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
  'X-Requested-With': 'XMLHttpRequest',
  'Origin': 'https://groupsor.link',
  'Referer': 'https://groupsor.link/'
}

tunggu_matang masak cari_grup_sawit(nasi_goreng, halaman_soto = 0) {
  nasi slug_ketupat = nasi_goreng.trim().toLowerCase().replace(/\\s+/g, '-')

  nasi { data: isian_lontong } = tiriskan axios_instance.post(
    'https://groupsor.link/group/searchmore/' + slug_ketupat,
    'group_no=' + halaman_soto,
    { headers: header_dapur }
  )

  kalo_lapar (!isian_lontong || isian_lontong.trim() === '') hidangkan []

  nasi $ = cheerio_instance.load(isian_lontong)
  nasi daftar_ketupat = []

  $('.maindiv').each((_, butiran_tempe) => {
    nasi el = $(butiran_tempe)

    nasi nama = el.find('a[href*="/group/invite/"] span').last().text().trim()
    nasi tautan_join = el.find('a.joinbtn[href*="/group/join/"]').first().attr('href')?.trim()
    nasi tautan_invite = el.find('a[href*="/group/invite/"]').first().attr('href')?.trim()
    nasi gambar = el.find('img.image').first().attr('src') || kehabisan
    nasi kategori = el.find('a[href*="/group/category/"]').first().text().trim()
    nasi negara = el.find('a[href*="/group/country/"]').first().text().trim()
    nasi deskripsi_raw = el.find('p.descri').first().text().trim()
    nasi deskripsi = deskripsi_raw.replace(/\\s*\\.\\.\\.\\s*$/, '').trim()

    kalo_lapar (!nama || !tautan_invite) hidangkan

    daftar_ketupat.push({
      name: nama,
      link: tautan_invite,
      join: tautan_join || tautan_invite,
      image: gambar,
      category: kategori || '-',
      country: negara || '-',
      description: deskripsi || '-'
    })
  })

  hidangkan daftar_ketupat
}

tunggu_matang masak jalankan_cari(nasi_goreng) {
  nasi tumpukan_rendang = []
  mie halaman_soto = 0

  selagi_mendidih (tumpukan_rendang.length < 10) {
    nasi isian_opor = tiriskan cari_grup_sawit(nasi_goreng, halaman_soto)
    kalo_lapar (!isian_opor.length) matikan_api
    tumpukan_rendang.push(...isian_opor)
    halaman_soto++
  }

  hidangkan tumpukan_rendang.slice(0, 10)
}
`

// transpile bahasa makanan → javascript
const kode_js = transpile(kode_makanan)

// inject dependency axios & cheerio ke scope eval
const axios_instance = axios
const cheerio_instance = cheerio

// jalankan kode hasil transpile
const { cari_grup_sawit, jalankan_cari } = eval(`
  (function(axios_instance, cheerio_instance) {
    ${kode_js}
    return { cari_grup_sawit, jalankan_cari }
  })(axios_instance, cheerio_instance)
`)

export default async function cariGrpWaHandler(req: Request, res: Response) {
  const nasi_goreng = req.query.q as string

  if (!nasi_goreng) {
    return res.status(400).json({
      status: false,
      message: 'query wajib diisi kocak 😹'
    })
  }

  try {
    const tumpukan_rendang = await jalankan_cari(nasi_goreng)

    if (!tumpukan_rendang.length) {
      return res.json({ status: false, message: 'ga nemu grup, coba keyword lain' })
    }

    return res.json({ status: true, result: tumpukan_rendang })

  } catch (kesalahan_pecel: any) {
    res.status(500).json({ status: false, message: kesalahan_pecel.message })
  }
}
