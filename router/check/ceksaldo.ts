import { Request, Response } from 'express'
import axios from 'axios'

type Wallet = 'gopay' | 'ovo' | 'dana' | 'shopeepay' | 'linkaja'

export default async (req: Request, res: Response) => {
  const { nomor, wallet } = req.query as Record<string, string>
  if (!nomor) return res.status(400).json({ status: false, message: 'Parameter nomor wajib diisi 😭' })
  if (!wallet) return res.status(400).json({ status: false, message: 'Parameter wallet wajib diisi 😭 (gopay/ovo/dana/shopeepay/linkaja)' })

  const w = wallet.toLowerCase() as Wallet
  const nomorBersih = nomor.replace(/\D/g, '').replace(/^0/, '62')

  try {
    switch (w) {
      case 'dana': return await cekDana(nomorBersih, res)
      case 'ovo': return await cekOvo(nomorBersih, res)
      case 'gopay': return await cekGopay(nomorBersih, res)
      case 'shopeepay': return await cekShopeepay(nomorBersih, res)
      case 'linkaja': return await cekLinkaja(nomorBersih, res)
      default: return res.status(400).json({ status: false, message: 'Wallet tidak dikenali. Pilih: gopay/ovo/dana/shopeepay/linkaja 😭' })
    }
  } catch (e: any) {
    res.status(500).json({ status: false, message: e.message })
  }
}

async function cekDana(nomor: string, res: Response) {
  const { data } = await axios.post(
    'https://m.dana.id/d/inquiry',
    { mobileNumber: `+${nomor}` },
    {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 12; SM-G991B)',
        'Origin': 'https://m.dana.id',
      },
      timeout: 8000,
      validateStatus: () => true,
    }
  )
  const nama = data?.response?.customerName || data?.customerName
  if (nama) {
    return res.json({ status: true, result: { wallet: 'DANA', nomor: `+${nomor}`, nama, terdaftar: true } })
  }
  return res.json({ status: true, result: { wallet: 'DANA', nomor: `+${nomor}`, terdaftar: false, pesan: 'Nomor tidak terdaftar di DANA' } })
}

async function cekOvo(nomor: string, res: Response) {
  const { data } = await axios.get(
    `https://api.ovo.id/v1/user/check?phone=${nomor}`,
    {
      headers: {
        'User-Agent': 'OVO/3.90.0 (Android 12; Samsung SM-G991B)',
        'app-id': 'net.ovo.id',
      },
      timeout: 8000,
      validateStatus: () => true,
    }
  )
  const nama = data?.data?.name || data?.name
  if (nama) {
    return res.json({ status: true, result: { wallet: 'OVO', nomor: `+${nomor}`, nama, terdaftar: true } })
  }
  return res.json({ status: true, result: { wallet: 'OVO', nomor: `+${nomor}`, terdaftar: false, pesan: 'Nomor tidak terdaftar di OVO' } })
}

async function cekGopay(nomor: string, res: Response) {
  const { data } = await axios.post(
    'https://api.gojek.com/gophp/v3/user/lookup',
    { phoneNumber: `+${nomor}` },
    {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Gojek/4.50.0 (Android)',
        'X-App-Id': 'gojek',
      },
      timeout: 8000,
      validateStatus: () => true,
    }
  )
  const nama = data?.data?.name || data?.name
  if (nama) {
    return res.json({ status: true, result: { wallet: 'GoPay', nomor: `+${nomor}`, nama, terdaftar: true } })
  }
  return res.json({ status: true, result: { wallet: 'GoPay', nomor: `+${nomor}`, terdaftar: false, pesan: 'Nomor tidak terdaftar di GoPay' } })
}

async function cekShopeepay(nomor: string, res: Response) {
  const { data } = await axios.post(
    'https://mall.shopee.co.id/api/v4/account/check_account_by_phone',
    { phone: nomor },
    {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 12)',
        'Referer': 'https://shopee.co.id',
      },
      timeout: 8000,
      validateStatus: () => true,
    }
  )
  const nama = data?.data?.username || data?.username
  if (nama) {
    return res.json({ status: true, result: { wallet: 'ShopeePay', nomor: `+${nomor}`, nama, terdaftar: true } })
  }
  return res.json({ status: true, result: { wallet: 'ShopeePay', nomor: `+${nomor}`, terdaftar: false, pesan: 'Nomor tidak terdaftar di ShopeePay' } })
}

async function cekLinkaja(nomor: string, res: Response) {
  const { data } = await axios.post(
    'https://api.linkaja.id/v2/account/inquiry',
    { msisdn: nomor },
    {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'LinkAja/5.0.0 (Android)',
      },
      timeout: 8000,
      validateStatus: () => true,
    }
  )
  const nama = data?.data?.name || data?.name
  if (nama) {
    return res.json({ status: true, result: { wallet: 'LinkAja', nomor: `+${nomor}`, nama, terdaftar: true } })
  }
  return res.json({ status: true, result: { wallet: 'LinkAja', nomor: `+${nomor}`, terdaftar: false, pesan: 'Nomor tidak terdaftar di LinkAja' } })
}
