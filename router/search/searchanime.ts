import { Request, Response } from 'express'
import axios from 'axios'

const anilist_url = 'https://graphql.anilist.co'

const query_rek = `
query ($input_muani: String, $page_amba: Int) {
  Page(page: $page_amba, perPage: 10) {
    media(search: $input_muani, type: ANIME, sort: POPULARITY_DESC) {
      id
      title { romaji english native }
      description(asHtml: false)
      coverImage { large extraLarge }
      bannerImage
      genres
      episodes
      status
      averageScore
      popularity
      season
      seasonYear
      format
      trailer { id site }
      siteUrl
    }
  }
}
`

async function fetch_anime_cik(input_muani: string, page_amba: number = 1) {
  const { data: balik_sepuh } = await axios.post(
    anilist_url,
    { query: query_rek, variables: { input_muani, page_amba } },
    { headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' } }
  )

  const list_muani = balik_sepuh.data?.Page?.media || []

  return list_muani.map((item_rek: any) => ({
    id: item_rek.id,
    judul: {
      romaji: item_rek.title?.romaji || '-',
      english: item_rek.title?.english || '-',
      native: item_rek.title?.native || '-'
    },
    // sinopsis dipotong 300 char biar ga kepanjangan
    sinopsis: item_rek.description
      ? item_rek.description.replace(/<[^>]*>/g, '').slice(0, 300) + '...'
      : '-',
    cover: item_rek.coverImage?.extraLarge || item_rek.coverImage?.large || null,
    banner: item_rek.bannerImage || null,
    genre: item_rek.genres || [],
    episode: item_rek.episodes || '?',
    status: item_rek.status || '-',
    skor: item_rek.averageScore ? `${item_rek.averageScore}/100` : '-',
    popularitas: item_rek.popularity || 0,
    // gabungin season sama year
    musim: item_rek.season && item_rek.seasonYear
      ? `${item_rek.season} ${item_rek.seasonYear}`
      : '-',
    format: item_rek.format || '-',
    trailer: item_rek.trailer
      ? `https://www.${item_rek.trailer.site}.com/watch?v=${item_rek.trailer.id}`
      : null,
    link: item_rek.siteUrl || null
  }))
}

export default async function searchAnimeHandler(req: Request, res: Response) {
  const input_muani = req.query.q as string
  const page_amba = parseInt(req.query.page as string) || 1

  if (!input_muani) {
    return res.status(400).json({
      status: false,
      message: 'query wajib diisi kocak 😹'
    })
  }

  try {
    const hasil_muani_amba = await fetch_anime_cik(input_muani, page_amba)

    if (!hasil_muani_amba.length) return res.json({
      status: false,
      message: 'ga nemu, coba keyword lain'
    })

    return res.json({ status: true, page: page_amba, result: hasil_muani_amba })

  } catch (error_cik: any) {
    res.status(500).json({ status: false, message: error_cik.message })
  }
}
