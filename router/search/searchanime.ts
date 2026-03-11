import { Request, Response } from 'express'
import axios from 'axios'

const anilist_url = 'https://graphql.anilist.co'

// query nya lumayan panjang, sabar 🗿
const query_anime = `
query ($judul: String, $page: Int) {
  Page(page: $page, perPage: 10) {
    media(search: $judul, type: ANIME, sort: POPULARITY_DESC) {
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

// fetch ke anilist, beliau ini gratis ga pake token riil 🙏
async function fetch_anime(judul: string, page: number = 1) {
  const { data: hasil_sepuh } = await axios.post(
    anilist_url,
    { query: query_anime, variables: { judul, page } },
    { headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' } }
  )

  const list_data = hasil_sepuh.data?.Page?.media || []

  return list_data.map((item: any) => ({
    id: item.id,
    judul: {
      romaji: item.title?.romaji || '-',
      english: item.title?.english || '-',
      native: item.title?.native || '-'
    },
    // dipotong 300 char, kebanyakan juga ga baik 
    sinopsis: item.description
      ? item.description.replace(/<[^>]*>/g, '').slice(0, 300) + '...'
      : '-',
    cover: item.coverImage?.extraLarge || item.coverImage?.large || null,
    banner: item.bannerImage || null,
    genre: item.genres || [],
    episode: item.episodes || '?',
    status: item.status || '-',
    skor: item.averageScore ? `${item.averageScore}/100` : '-',
    popularitas: item.popularity || 0,
    musim: item.season && item.seasonYear ? `${item.season} ${item.seasonYear}` : '-',
    format: item.format || '-',
    trailer: item.trailer
      ? `https://www.${item.trailer.site}.com/watch?v=${item.trailer.id}`
      : null,
    link: item.siteUrl || null
  }))
}

export default async function searchAnimeHandler(req: Request, res: Response) {
  const judul = req.query.q as string
  const page = parseInt(req.query.page as string) || 1

  // konsepnya kalo q nya kosong 😭
  if (!judul) {
    return res.status(400).json({
      status: false,
      message: 'query wajib diisi kocak 😹'
    })
  }

  try {
    const data_balik = await fetch_anime(judul, page)

    if (!data_balik.length) return res.json({
      status: false,
      message: 'ga nemu maszeh, coba keyword lain 🗿'
    })

    return res.json({ status: true, page, result: data_balik })

  } catch (err: any) {
    // mending turu 😭
    res.status(500).json({ status: false, message: err.message })
  }
}
