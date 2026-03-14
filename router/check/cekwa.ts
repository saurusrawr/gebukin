import { Request, Response } from 'express'
import axios from 'axios'

export default async (req: Request, res: Response) => {
  const { nomor } = req.query as Record<string, string>
  if (!nomor) return res.status(400).json({ status: false, message: 'Parameter nomor wajib diisi 😭' })

  // normalize nomor
  let nomorBersih = nomor.replace(/\D/g, '')
  if (nomorBersih.startsWith('0')) nomorBersih = '62' + nomorBersih.slice(1)
  if (!nomorBersih.startsWith('62')) nomorBersih = '62' + nomorBersih

  const waId = nomorBersih + '@s.whatsapp.net'

  try {
    // cek via wa.me (redirect = aktif, 404 = tidak aktif)
    const { status, headers } = await axios.get(
      `https://wa.me/${nomorBersih}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept-Language': 'id-ID,id;q=0.9',
        },
        timeout: 8000,
        maxRedirects: 0,
        validateStatus: () => true,
      }
    )

    // wa.me redirect ke halaman chat = nomor valid/terdaftar
    // kalau 404 atau redirect ke halaman error = tidak terdaftar
    const aktif = status === 200 || status === 301 || status === 302

    // cek tambahan via WhatsApp Business API
    let nama = null
    let foto = null
    try {
      const { data } = await axios.get(
        `https://api.whatsapp.com/send?phone=${nomorBersih}`,
        {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          timeout: 5000,
          validateStatus: () => true,
        }
      )
      const namaMatch = String(data).match(/"formatted_name":"([^"]+)"/)
      const fotoMatch = String(data).match(/"profile_picture_url":"([^"]+)"/)
      if (namaMatch) nama = namaMatch[1]
      if (fotoMatch) foto = fotoMatch[1].replace(/\\/g, '')
    } catch {}

    return res.json({
      status: true,
      result: {
        nomor: `+${nomorBersih}`,
        waId,
        aktif,
        keterangan: aktif ? 'Nomor terdaftar di WhatsApp ✅' : 'Nomor tidak terdaftar di WhatsApp ❌',
        nama: nama || null,
        foto: foto || null,
      }
    })
  } catch (e: any) {
    res.status(500).json({ status: false, message: e.message })
  }
}
