import { Request, Response } from 'express'
import axios from 'axios'

const csrftoken = 'vpemnXpzAiG3NnM025w1PHYWK65fQjxA'
const sessionid = '40575122137%3AyDvTJqlZnMbs2K%3A28%3AAYiWibnkoUtnjM8CXmP38dv6fDaNCYAWbArMU8dZzg'
const rur = '"HIL\05440575122137\0541804805184:01fe17c6"'
const cookie_sawit = `csrftoken=${csrftoken}; sessionid=${sessionid}; rur=${rur}`

// rotate ua biar ga kedetect
const daftar_ua_rendang = [
  'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
]

const ambil_ua_random = () => daftar_ua_rendang[Math.floor(Math.random() * daftar_ua_rendang.length)]

const tunggu_dulu = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function ambil_profil_instagram(nama_sawit: string, percobaan: number = 0): Promise<any> {
  const ua_terpilih = ambil_ua_random()

  try {
    // coba endpoint v1 dulu
    const { data: isian_lontong } = await axios.get(
      `https://www.instagram.com/api/v1/users/web_profile_info/?username=${nama_sawit}`,
      {
        headers: {
          'User-Agent': ua_terpilih,
          'Accept': '*/*',
          'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': `https://www.instagram.com/${nama_sawit}/`,
          'X-IG-App-ID': '936619743392459',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRFToken': csrftoken,
          'X-Instagram-AJAX': '1',
          'Origin': 'https://www.instagram.com',
          'Cookie': cookie_sawit,
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin',
          'Connection': 'keep-alive'
        },
        timeout: 15000
      }
    )

    const butiran_tempe = isian_lontong.data?.user
    if (!butiran_tempe) throw new Error('profil tidak ditemukan')
    return butiran_tempe

  } catch (kesalahan_soto: any) {
    // kalo 429 coba retry max 3x dengan delay
    if (kesalahan_soto?.response?.status === 429 && percobaan < 3) {
      await tunggu_dulu(2000 * (percobaan + 1))
      return ambil_profil_instagram(nama_sawit, percobaan + 1)
    }

    // kalo masih gagal coba endpoint graphql
    if (percobaan >= 3) {
      return await ambil_via_graphql(nama_sawit)
    }

    throw kesalahan_soto
  }
}

// fallback pake graphql endpoint
async function ambil_via_graphql(nama_sawit: string) {
  const { data: isian_opor } = await axios.get(
    `https://www.instagram.com/${nama_sawit}/?__a=1&__d=dis`,
    {
      headers: {
        'User-Agent': ambil_ua_random(),
        'Accept': 'application/json',
        'Accept-Language': 'id-ID,id;q=0.9',
        'Referer': 'https://www.instagram.com/',
        'X-CSRFToken': csrftoken,
        'Cookie': cookie_sawit
      },
      timeout: 15000
    }
  )

  const butiran_tempe = isian_opor.graphql?.user || isian_opor.data?.user
  if (!butiran_tempe) throw new Error('profil tidak ditemukan')
  return butiran_tempe
}

function format_profil(butiran_tempe: any) {
  return {
    id: butiran_tempe.id,
    username: butiran_tempe.username,
    nama: butiran_tempe.full_name || '-',
    bio: butiran_tempe.biography || '-',
    foto: butiran_tempe.profile_pic_url_hd || butiran_tempe.profile_pic_url || null,
    followers: butiran_tempe.edge_followed_by?.count ?? butiran_tempe.follower_count ?? 0,
    following: butiran_tempe.edge_follow?.count ?? butiran_tempe.following_count ?? 0,
    postingan: butiran_tempe.edge_owner_to_timeline_media?.count ?? butiran_tempe.media_count ?? 0,
    private: butiran_tempe.is_private || false,
    verified: butiran_tempe.is_verified || false,
    kategori: butiran_tempe.category_name || '-',
    external_url: butiran_tempe.external_url || null,
    link: `https://www.instagram.com/${butiran_tempe.username}/`
  }
}

export default async function stalkerInstagramHandler(req: Request, res: Response) {
  const nama_sawit = req.query.username as string || req.query.user as string

  if (!nama_sawit) {
    return res.status(400).json({
      status: false,
      message: "kasih param 'username' kocak 😹"
    })
  }

  try {
    const data_mentah = await ambil_profil_instagram(nama_sawit)
    const sajian_nasi_kuning = format_profil(data_mentah)
    return res.json({ status: true, result: sajian_nasi_kuning })
  } catch (kesalahan_pecel: any) {
    res.status(500).json({ status: false, message: kesalahan_pecel.message })
  }
}
