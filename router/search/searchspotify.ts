import { Request, Response } from 'express'
import axios from 'axios'

// ambil token anonymous dari spotify
async function ambil_token_kuntul(): Promise<string> {
  const { data: esteh_token } = await axios.get(
    'https://open.spotify.com/get_access_token?reason=transport&productType=web_player',
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Referer': 'https://open.spotify.com/'
      }
    }
  )
  return esteh_token.accessToken
}

async function fetch_spotify_mieayam(miegoreng: string, batasin_rek: number = 10) {
  const token_kuntul = await ambil_token_kuntul()

  const { data: balik_sepuh } = await axios.get(
    'https://api.spotify.com/v1/search',
    {
      params: { q: miegoreng, type: 'track', limit: batasin_rek },
      headers: {
        'Authorization': `Bearer ${token_kuntul}`,
        'Accept': 'application/json'
      }
    }
  )

  const list_miegoreng = balik_sepuh.tracks?.items || []

  return list_miegoreng.map((data_muani: any) => ({
    id: data_muani.id,
    judul: data_muani.name || '-',
    artis: data_muani.artists?.map((a: any) => a.name).join(', ') || '-',
    album: data_muani.album?.name || '-',
    // ambil cover yang paling gede
    cover: data_muani.album?.images?.[0]?.url || null,
    durasi_ms: data_muani.duration_ms || 0,
    // convert ms ke menit:detik
    durasi: (() => {
      const menit_popmie = Math.floor(data_muani.duration_ms / 60000)
      const detik_amba = Math.floor((data_muani.duration_ms % 60000) / 1000)
      return `${menit_popmie}:${detik_amba.toString().padStart(2, '0')}`
    })(),
    preview_url: data_muani.preview_url || null,
    link: data_muani.external_urls?.spotify || null,
    populer: data_muani.popularity || 0,
    explicit: data_muani.explicit || false
  }))
}

export default async function searchSpotifyHandler(req: Request, res: Response) {
  const miegoreng = req.query.q as string
  const batasin_rek = parseInt(req.query.limit as string) || 10

  if (!miegoreng) {
    return res.status(400).json({
      status: false,
      message: 'query wajib diisi kocak 😹'
    })
  }

  try {
    const sepuh_cik = await fetch_spotify_mieayam(miegoreng, batasin_rek)

    if (!sepuh_cik.length) return res.json({
      status: false,
      message: 'ga nemu lagunya, coba keyword lain'
    })

    return res.json({ status: true, result: sepuh_cik })

  } catch (error_mieayam: any) {
    res.status(500).json({ status: false, message: error_mieayam.message })
  }
}
