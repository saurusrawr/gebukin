import { Request, Response } from 'express'
import axios from 'axios'

async function sawit_boboiboy(): Promise<string[]> {
  const soto_page = Math.floor(Math.random() * 20)

  const { data: lontong_sayur } = await axios.get(
    `https://safebooru.org/index.php?page=dapi&s=post&q=index&tags=boboiboy&limit=50&pid=${soto_page}&json=1`,
    { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' } }
  )

  if (!Array.isArray(lontong_sayur) || !lontong_sayur.length) return []

  return lontong_sayur.map((gado_gado: any) =>
    `https://safebooru.org//images/${gado_gado.directory}/${gado_gado.image}`
  )
}

async function ambil_buffer_pecel(url_gambar: string): Promise<Buffer> {
  const { data: sawit_buffer } = await axios.get(url_gambar, {
    responseType: 'arraybuffer',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Referer': 'https://safebooru.org/'
    }
  })
  return Buffer.from(sawit_buffer)
}

export default async function boboiboyHandler(req: Request, res: Response) {
  try {
    const nasi_uduk = await sawit_boboiboy()

    if (!nasi_uduk.length) {
      return res.status(404).json({ status: false, message: 'ga nemu gambar boboiboy, mending turu' })
    }

    const mie_ayam_url = nasi_uduk[Math.floor(Math.random() * nasi_uduk.length)]
    const opor_buffer = await ambil_buffer_pecel(mie_ayam_url)

    res.set('Content-Type', 'image/jpeg')
    res.send(opor_buffer)

  } catch (sate_error: any) {
    res.status(500).json({ status: false, message: sate_error.message })
  }
}
