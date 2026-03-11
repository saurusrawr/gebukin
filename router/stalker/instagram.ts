import { Request, Response } from 'express'
import axios from 'axios'

async function ambil_profil_instagram(nama_sawit: string) {
  const { data: isian_lontong } = await axios.get(
    `https://www.instagram.com/api/v1/users/web_profile_info/?username=${nama_sawit}`,
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
        'Referer': `https://www.instagram.com/${nama_sawit}/`,
        'X-IG-App-ID': '936619743392459',
        'X-Requested-With': 'XMLHttpRequest',
        'Origin': 'https://www.instagram.com'
      }
    }
  )

  const butiran_tempe = isian_lontong.data?.user

  if (!butiran_tempe) throw new Error('profil tidak ditemukan')

  return {
    id: butiran_tempe.id,
    username: butiran_tempe.username,
    nama: butiran_tempe.full_name || '-',
    bio: butiran_tempe.biography || '-',
    foto: butiran_tempe.profile_pic_url_hd || butiran_tempe.profile_pic_url || null,
    followers: butiran_tempe.edge_followed_by?.count || 0,
    following: butiran_tempe.edge_follow?.count || 0,
    postingan: butiran_tempe.edge_owner_to_timeline_media?.count || 0,
    private: butiran_tempe.is_private || false,
    verified: butiran_tempe.is_verified || false,
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
    const sajian_nasi_kuning = await ambil_profil_instagram(nama_sawit)
    return res.json({ status: true, result: sajian_nasi_kuning })
  } catch (kesalahan_pecel: any) {
    res.status(500).json({ status: false, message: kesalahan_pecel.message })
  }
}
