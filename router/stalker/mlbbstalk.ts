import { Request, Response } from "express"
import axios from "axios"

const base_url = "https://bonipedia.my.id"

// header buat semua request ke bonipedia
const header_boni = {
  'Accept': '*/*',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'Content-Type': 'application/json',
  'Origin': base_url,
  'Referer': base_url + '/',
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
}

// tembak semua sekaligus biar ngebut, no cap
async function cek_semua(user_id: string, zone_id: string) {
  const [nickname, bind, profil] = await Promise.all([
    // cek nickname doang, quick mode
    axios.post(`${base_url}/cek_api.php`, {
      userId: user_id, zoneId: zone_id, action: 'nickname', quick: true
    }, { headers: header_boni, timeout: 15000 }),

    // cek bind akun, agak lama
    axios.post(`${base_url}/cek_api.php`, {
      userId: user_id, zoneId: zone_id, action: 'cekbind', quick: false
    }, { headers: header_boni, timeout: 15000 }),

    // profil lengkap, paling lama
    axios.post(`${base_url}/cek_api.php`, {
      userId: user_id, zoneId: zone_id, action: 'search', quick: false
    }, { headers: header_boni, timeout: 15000 })
  ])

  return {
    userId: user_id,
    zoneId: zone_id,
    nickname: nickname.data,
    bind: bind.data,
    profil: profil.data
  }
}

export default async function mlbbstalkHandler(req: Request, res: Response) {
  const user_id = String(req.query.userId || req.query.uid || "").trim()
  const zone_id = String(req.query.zoneId || req.query.zone || "").trim()

  if (!user_id || !zone_id) {
    return res.status(400).json({
      status: false,
      // lha kurang parameter, masa mau stalk angin
      message: "userId dan zoneId wajib diisi, contoh: ?userId=12345678&zoneId=1234"
    })
  }

  try {
    const hasil = await cek_semua(user_id, zone_id)
    res.json({ status: true, ...hasil })
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message })
  }
  }
    
