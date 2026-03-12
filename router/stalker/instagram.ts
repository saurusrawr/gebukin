import { Request, Response } from 'express'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'

puppeteer.use(StealthPlugin())

// simpen cookie biar ga login ulang tiap request
let sesi_tersimpan: any[] = []

async function ambil_profil_instagram(username: string) {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  })

  try {
    const halaman = await browser.newPage()

    await halaman.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36')
    await halaman.setExtraHTTPHeaders({ 'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8' })

    // inject cookie tersimpan kalo ada
    if (sesi_tersimpan.length) {
      await halaman.setCookie(...sesi_tersimpan)
    }

    // fetch API instagram dari dalam browser context
    const hasil = await halaman.evaluate(async (user: string) => {
      const res = await fetch(
        `https://www.instagram.com/api/v1/users/web_profile_info/?username=${user}`,
        {
          headers: {
            'Accept': '*/*',
            'X-IG-App-ID': '936619743392459',
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': `https://www.instagram.com/${user}/`
          }
        }
      )

      if (!res.ok) throw new Error('status: ' + res.status)
      return await res.json()
    }, username)

    // simpan cookie session buat request berikutnya
    sesi_tersimpan = await halaman.cookies()

    await browser.close()

    const profil = hasil.data?.user
    if (!profil) throw new Error('profil tidak ditemukan')

    return {
      id: profil.id,
      username: profil.username,
      nama: profil.full_name || '-',
      bio: profil.biography || '-',
      foto: profil.profile_pic_url_hd || profil.profile_pic_url || null,
      followers: profil.edge_followed_by?.count ?? profil.follower_count ?? 0,
      following: profil.edge_follow?.count ?? profil.following_count ?? 0,
      postingan: profil.edge_owner_to_timeline_media?.count ?? profil.media_count ?? 0,
      private: profil.is_private || false,
      verified: profil.is_verified || false,
      kategori: profil.category_name || '-',
      website: profil.external_url || null,
      link: `https://www.instagram.com/${profil.username}/`
    }

  } catch (err) {
    await browser.close()
    throw err
  }
}

export default async function stalkerInstagramHandler(req: Request, res: Response) {
  const username = req.query.username as string || req.query.user as string

  if (!username) {
    return res.status(400).json({
      status: false,
      message: 'kasih username instagram nya bestie 😭'
    })
  }

  try {
    const profil = await ambil_profil_instagram(username)
    return res.json({ status: true, result: profil })
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message })
  }
}
