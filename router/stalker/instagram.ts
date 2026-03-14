import { Request, Response } from 'express'
import axios from 'axios'

// cache session cookie biar ga fetch ulang tiap request
let igSession = ''
let igCsrf = ''
let lastSession = 0
const SESSION_TTL = 30 * 60 * 1000 // 30 menit

async function getSession() {
  const now = Date.now()
  if (igSession && igCsrf && now - lastSession < SESSION_TTL) return

  // hit instagram dulu buat dapet cookie session
  const { headers } = await axios.get('https://www.instagram.com/', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    },
    timeout: 10000,
  })

  const cookies = (headers['set-cookie'] || []) as string[]
  const cookieStr = cookies.map(c => c.split(';')[0]).join('; ')

  const csrf = cookies
    .find(c => c.includes('csrftoken'))
    ?.split(';')[0]
    ?.split('=')[1] || ''

  igSession = cookieStr
  igCsrf = csrf
  lastSession = now
}

async function stalkerIG(username: string) {
  await getSession()

  // coba endpoint v1 dulu
  try {
    const { data } = await axios.get(
      `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
          'X-IG-App-ID': '936619743392459',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRFToken': igCsrf,
          'Referer': `https://www.instagram.com/${username}/`,
          'Cookie': igSession,
          'Origin': 'https://www.instagram.com',
          'Connection': 'keep-alive',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin',
        },
        timeout: 12000,
      }
    )

    const profil = data?.data?.user
    if (!profil) throw new Error('profil tidak ditemukan')
    return formatProfil(profil)

  } catch (e1: any) {
    // kalau 401/403, reset session dan coba lagi sekali
    if (e1?.response?.status === 401 || e1?.response?.status === 403) {
      igSession = ''; igCsrf = ''; lastSession = 0
      await getSession()
    }

    // fallback: endpoint graphql lama
    const { data } = await axios.get(
      `https://www.instagram.com/${encodeURIComponent(username)}/?__a=1&__d=dis`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'id-ID,id;q=0.9',
          'X-IG-App-ID': '936619743392459',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRFToken': igCsrf,
          'Referer': `https://www.instagram.com/${username}/`,
          'Cookie': igSession,
        },
        timeout: 12000,
      }
    )

    const profil = data?.graphql?.user || data?.data?.user
    if (!profil) throw new Error('profil tidak ditemukan, coba lagi nanti 😭')
    return formatProfil(profil)
  }
}

function formatProfil(p: any) {
  return {
    id: p.id || null,
    username: p.username,
    nama: p.full_name || '-',
    bio: p.biography || '-',
    foto: p.profile_pic_url_hd || p.profile_pic_url || null,
    followers: p.edge_followed_by?.count ?? p.follower_count ?? 0,
    following: p.edge_follow?.count ?? p.following_count ?? 0,
    postingan: p.edge_owner_to_timeline_media?.count ?? p.media_count ?? 0,
    private: p.is_private || false,
    verified: p.is_verified || false,
    kategori: p.category_name || '-',
    website: p.external_url || null,
    link: `https://www.instagram.com/${p.username}/`,
  }
}

export default async (req: Request, res: Response) => {
  const username = (req.query.username || req.query.user) as string
  if (!username) return res.status(400).json({ status: false, message: 'kasih username instagram nya bestie 😭' })

  try {
    const profil = await stalkerIG(username.replace('@', '').trim())
    return res.json({ status: true, result: profil })
  } catch (e: any) {
    res.status(500).json({ status: false, message: e.message })
  }
}
