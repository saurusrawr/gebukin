import { Request, Response } from 'express'
import axios from 'axios'

export default async (req: Request, res: Response) => {
  const { nomor } = req.query as Record<string, string>
  if (!nomor) return res.status(400).json({ status: false, message: 'Parameter nomor wajib diisi 😭' })

  let hp = nomor.replace(/\D/g, '')
  if (hp.startsWith('0')) hp = '62' + hp.slice(1)
  if (!hp.startsWith('62')) hp = '62' + hp

  try {
    const [r1, r2] = await Promise.allSettled([
      scrapeWaMe(hp),
      scrapeWaApi(hp),
    ])

    const d1 = r1.status === 'fulfilled' ? r1.value : null
    const d2 = r2.status === 'fulfilled' ? r2.value : null

    // merge hasil dari kedua sumber, prioritas yang ada datanya
    const merged = {
      nomor: `+${hp}`,
      terdaftar: !!(d1?.terdaftar || d2?.terdaftar),
      nama:  d1?.nama  || d2?.nama  || null,
      foto:  d1?.foto  || d2?.foto  || null,
      about: d1?.about || d2?.about || null,
      link:  `https://wa.me/${hp}`,
    }

    if (!merged.terdaftar) {
      return res.status(404).json({
        status: false,
        message: `Nomor +${hp} tidak terdaftar di WhatsApp atau semua data diprivatkan 😭`
      })
    }

    return res.json({ status: true, result: merged })

  } catch (e: any) {
    res.status(500).json({ status: false, message: e.message })
  }
}

async function scrapeWaMe(hp: string) {
  const { data, status } = await axios.get(`https://wa.me/${hp}`, {
    headers: {
      'User-Agent': 'WhatsApp/2.23.24.82 A',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
    },
    timeout: 10000,
    maxRedirects: 5,
    validateStatus: () => true,
  })

  const html = String(data)
  const terdaftar = status === 200 && (
    html.includes('wa-open-chat') ||
    html.includes('_href') ||
    html.includes('open.whatsapp')
  )

  const nama  = html.match(/og:title[^>]+content="([^"]+)"/)?.[1]?.trim()
             || html.match(/"name"\s*:\s*"([^"]+)"/)?.[1]?.trim()
             || null

  const foto  = html.match(/og:image[^>]+content="(https[^"]+)"/)?.[1]
             || html.match(/"profilePicUrl"\s*:\s*"([^"]+)"/)?.[1]?.replace(/\\/g, '')
             || null

  const about = html.match(/og:description[^>]+content="([^"]+)"/)?.[1]?.trim()
             || html.match(/"status"\s*:\s*"([^"]+)"/)?.[1]?.trim()
             || null

  return { terdaftar, nama, foto, about }
}

async function scrapeWaApi(hp: string) {
  const { data } = await axios.get('https://api.whatsapp.com/send', {
    params: { phone: hp },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'id-ID,id;q=0.9',
      'Referer': 'https://web.whatsapp.com/',
    },
    timeout: 10000,
    validateStatus: () => true,
  })

  const html = String(data)

  const decode = (s: string) => s.replace(/\\u[\da-f]{4}/gi, c => String.fromCharCode(parseInt(c.slice(2), 16))).replace(/\\\//g, '/').trim()

  const namaRaw  = html.match(/"formatted_name"\s*:\s*"([^"]+)"/)?.[1]
  const fotoRaw  = html.match(/"profile_picture_url"\s*:\s*"([^"]+)"/)?.[1]
  const aboutRaw = html.match(/"status"\s*:\s*"([^"]+)"/)?.[1]

  const terdaftar = html.includes('wa-continue') || html.includes('open.whatsapp') || !!namaRaw

  return {
    terdaftar,
    nama:  namaRaw  ? decode(namaRaw)  : null,
    foto:  fotoRaw  ? decode(fotoRaw)  : null,
    about: aboutRaw ? decode(aboutRaw) : null,
  }
}
