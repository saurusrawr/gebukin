import { Request, Response } from 'express'
import axios from 'axios'

const csrftoken = 'vpemnXpzAiG3NnM025w1PHYWK65fQjxA'
const sessionid = '40575122137%3AyDvTJqlZnMbs2K%3A28%3AAYiWibnkoUtnjM8CXmP38dv6fDaNCYAWbArMU8dZzg'
const cookie_sawit = `csrftoken=${csrftoken}; sessionid=${sessionid}`

const tunggu_dulu = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function ambil_profil_instagram(nama_sawit: string, percobaan: number = 0): Promise<any> {
  try {
    // pake i.instagram.com mobile api, lebih stabil
    const { data: isian_lontong } = await axios.get(
      `https://i.instagram.com/api/v1/users/web_profile_info/?username=${nama_sawit}`,
      {
        headers: {
          'User-Agent': 'Instagram 269.0.0.18.75 Android (26/8.0.0; 480dpi; 1080x1920; OnePlus; 6T Dev; devitron; qcom; en_US; 314665256)',
          'Accept': '*/*',
          'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
          'X-IG-App-ID': '936619743392459',
          'X-CSRFToken': csrftoken,
          'Cookie': cookie_sawit
        },
        maxRedirects: 5,
        timeout: 15000
      }
    )

    const butiran_tempe = isian_lontong.data?.user
    if (!butiran_tempe) throw new Error('profil tidak ditemukan')
    return butiran_tempe

  } catch (kesalahan_soto: any) {
    if (kesalahan_soto?.response?.status === 429 && percobaan < 3) {
      await tunggu_dulu(2000 * (percobaan + 1))
      return ambil_profil_instagram(nama_sawit, percobaan + 1)
    }

    if (percobaan >= 3) {
      return await ambil_via_graphql(nama_sawit)
    }

    throw kesalahan_soto
  }
}

async function ambil_via_graphql(nama_sawit: string) {
  const { data: isian_opor } = await axios.get(
    `https://www.instagram.com/${nama_sawit}/?__a=1&__d=dis`,
    {
      headers: {
        'User-Agent': 'Instagram 269.0.0.18.75 Android (26/8.0.0; 480dpi; 1080x1920; OnePlus; 6T Dev; devitron; qcom; en_US; 314665256)',
        'Accept': 'application/json',
        'X-CSRFToken': csrftoken,
        'Cookie': cookie_sawit
      },
      maxRedirects: 5,
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
