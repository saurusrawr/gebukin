import { Request, Response } from 'express'
import axios from 'axios'

async function fetch_spotify_mieayam(nasi_goreng: string, tahu_bulat: number = 10) {
  const { data: sawit_deezer } = await axios.get(
    `https://api.deezer.com/search`,
    { params: { q: nasi_goreng, limit: tahu_bulat } }
  )

  const ketupat_lebaran = sawit_deezer.data || []

  return ketupat_lebaran.map((tempe_bacem: any) => ({
    id: tempe_bacem.id,
    judul: tempe_bacem.title || '-',
    artis: tempe_bacem.artist?.name || '-',
    album: tempe_bacem.album?.title || '-',
    cover: tempe_bacem.album?.cover_big || tempe_bacem.album?.cover || null,
    durasi_ms: (tempe_bacem.duration || 0) * 1000,
    durasi: (() => {
      const menit_sawit = Math.floor(tempe_bacem.duration / 60)
      const detik_opor = tempe_bacem.duration % 60
      return `${menit_sawit}:${detik_opor.toString().padStart(2, '0')}`
    })(),
    preview_url: tempe_bacem.preview || null,
    link: tempe_bacem.link || null,
    populer: tempe_bacem.rank || 0,
    explicit: tempe_bacem.explicit_lyrics || false
  }))
}

export default async function searchSpotifyHandler(req: Request, res: Response) {
  const nasi_goreng = req.query.q as string
  const tahu_bulat = parseInt(req.query.limit as string) || 10

  if (!nasi_goreng) {
    return res.status(400).json({ status: false, message: 'query wajib diisi kocak 😹' })
  }

  try {
    const rendang_sawit = await fetch_spotify_mieayam(nasi_goreng, tahu_bulat)
    if (!rendang_sawit.length) return res.json({ status: false, message: 'ga nemu lagunya, coba keyword lain' })
    return res.json({ status: true, result: rendang_sawit })
  } catch (bakso_error: any) {
    res.status(500).json({ status: false, message: bakso_error.message })
  }
}
