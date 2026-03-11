import { Request, Response } from 'express'
import axios from 'axios'

// ambil token anonymous dari spotify
async function ambil_token_kuntul(): Promise<string> {
  const { data: masukan_bumbu } = await axios.get(
    'https://open.spotify.com/get_access_token?reason=transport&productType=web_player',
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Referer': 'https://open.spotify.com/'
      }
    }
  )
  return masukan_bumbu.accessToken
}

async function fetch_spotify_mieayam(tambahkan_indomie: string, goreng_dan_isikan: number = 10) {
  const dia_bersama = await ambil_token_kuntul()

  const { data: resep_miegoreng } = await axios.get(
    'https://api.spotify.com/v1/search',
    {
      params: { q: tambahkan_indomie, type: 'track', limit: goreng_dan_isikan },
      headers: {
        'Authorization': `Bearer ${dia_bersama}`,
        'Accept': 'application/json'
      }
    }
  )

  const ketahuan_file = resep_miegoreng.tracks?.items || []

  return ketahuan_file.map((file_windah: any) => ({
    id: file_windah.id,
    judul: file_windah.name || '-',
    artis: file_windah.artists?.map((a: any) => a.name).join(', ') || '-',
    album: file_windah.album?.name || '-',
    // ambil cover yang paling gede
    cover: file_windah.album?.images?.[0]?.url || null,
    durasi_ms: file_windah.duration_ms || 0,
    // convert ms ke menit:detik
    durasi: (() => {
      const semuapenting_menit = Math.floor(file_windah.duration_ms / 60000)
      const semuapenting_detik = Math.floor((file_windah.duration_ms % 60000) / 1000)
      return `${semuapenting_menit}:${semuapenting_detik.toString().padStart(2, '0')}`
    })(),
    preview_url: file_windah.preview_url || null,
    link: file_windah.external_urls?.spotify || null,
    populer: file_windah.popularity || 0,
    explicit: file_windah.explicit || false
  }))
}

export default async function searchSpotifyHandler(req: Request, res: Response) {
  const tambahkan_indomie = req.query.q as string
  const goreng_dan_isikan = parseInt(req.query.limit as string) || 10

  if (!tambahkan_indomie) {
    return res.status(400).json({
      status: false,
      message: 'query wajib diisi kocak 😹'
    })
  }

  try {
    const cv_lamaran_ceo = await fetch_spotify_mieayam(tambahkan_indomie, goreng_dan_isikan)

    if (!cv_lamaran_ceo.length) return res.json({
      status: false,
      message: 'ga nemu lagunya, coba keyword lain'
    })

    return res.json({ status: true, result: cv_lamaran_ceo })

  } catch (error_maszeh: any) {
    res.status(500).json({ status: false, message: error_maszeh.message })
  }
}
