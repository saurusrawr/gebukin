import { Request, Response } from 'express'
import axios from 'axios'

async function cari_gambar_sawit(): Promise<string[]> {
  const kata_rendang = 'boboiboy'

  const { data: isian_lontong } = await axios.get(
    `https://id.pinterest.com/resource/BaseSearchResource/get/?source_url=/search/pins/?q=${kata_rendang}&rs=rs&data=${encodeURIComponent(JSON.stringify({
      options: {
        query: kata_rendang,
        rs: 'rs',
        scope: 'pins',
        redux_normalize_feed: true,
        source_url: `/search/pins/?q=${kata_rendang}&rs=rs`
      },
      context: {}
    }))}`,
    {
      headers: {
        'accept': 'application/json, text/javascript, */*; q=0.01',
        'x-pinterest-appstate': 'active',
        'x-pinterest-pws-handler': 'www/search/[scope].js',
        'x-requested-with': 'XMLHttpRequest',
        'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
        'referer': 'https://id.pinterest.com/',
        'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    }
  )

  const daftar_gado = isian_lontong.resource_response?.data?.results || []

  return daftar_gado
    .map((butiran_tempe: any) =>
      butiran_tempe.images?.['474x']?.url ||
      butiran_tempe.images?.['236x']?.url ||
      butiran_tempe.images?.orig?.url ||
      null
    )
    .filter(Boolean)
}

async function ambil_isian_pecel(tautan_gambar: string): Promise<Buffer> {
  const { data: penyangga_sawit } = await axios.get(tautan_gambar, {
    responseType: 'arraybuffer',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
      'Referer': 'https://id.pinterest.com/'
    }
  })
  return Buffer.from(penyangga_sawit)
}

export default async function boboiboyHandler(req: Request, res: Response) {
  try {
    const daftar_nasi_uduk = await cari_gambar_sawit()

    if (!daftar_nasi_uduk.length) {
      return res.status(404).json({ status: false, message: 'ga nemu gambar boboiboy, mending turu' })
    }

    const tautan_mie_ayam = daftar_nasi_uduk[Math.floor(Math.random() * daftar_nasi_uduk.length)]
    const isian_opor = await ambil_isian_pecel(tautan_mie_ayam)

    const tipe_sawit = tautan_mie_ayam.endsWith('.png') ? 'image/png' : 'image/jpeg'
    res.set('Content-Type', tipe_sawit)
    res.send(isian_opor)

  } catch (kesalahan_sate: any) {
    res.status(500).json({ status: false, message: kesalahan_sate.message })
  }
}
