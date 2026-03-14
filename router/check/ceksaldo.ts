import { Request, Response } from 'express'
import axios from 'axios'

type Wallet = 'gopay' | 'ovo' | 'dana' | 'shopeepay' | 'linkaja'

export default async (req: Request, res: Response) => {
  const { nomor, wallet } = req.query as Record<string, string>
  if (!nomor) return res.status(400).json({ status: false, message: 'Parameter nomor wajib diisi 😭' })
  if (!wallet) return res.status(400).json({ status: false, message: 'Parameter wallet wajib diisi 😭 (gopay/ovo/dana/shopeepay/linkaja)' })

  // normalize nomor → 62xxx
  let hp = nomor.replace(/\D/g, '')
  if (hp.startsWith('0')) hp = '62' + hp.slice(1)
  if (!hp.startsWith('62')) hp = '62' + hp

  const w = wallet.toLowerCase() as Wallet

  try {
    switch (w) {
      case 'dana':      return await cekDana(hp, res)
      case 'ovo':       return await cekOvo(hp, res)
      case 'gopay':     return await cekGopay(hp, res)
      case 'shopeepay': return await cekShopee(hp, res)
      case 'linkaja':   return await cekLinkaja(hp, res)
      default:
        return res.status(400).json({ status: false, message: 'Wallet tidak dikenali. Pilih: gopay / ovo / dana / shopeepay / linkaja 😭' })
    }
  } catch (e: any) {
    res.status(500).json({ status: false, message: e.message })
  }
}

// ===================== DANA =====================
async function cekDana(hp: string, res: Response) {
  // DANA pake endpoint inquiry transfer publik
  const { data } = await axios.post(
    'https://m.dana.id/n/jagaInquiry',
    {
      request: {
        head: {
          version: '2.0',
          function: 'dana.member.inquiry.queryMemberInfo',
          clientId: 'CLIENT_ID_FOR_SANDBOX',
          reqTime: new Date().toISOString(),
          reqMsgId: Date.now().toString(),
          clientSecret: '',
          reserve: '{}'
        },
        body: {
          mobileNumber: `+${hp}`
        }
      }
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36',
        'Origin': 'https://m.dana.id',
        'Referer': 'https://m.dana.id/',
      },
      timeout: 10000,
      validateStatus: () => true,
    }
  )

  const nama = data?.response?.body?.name
    || data?.response?.body?.memberInfo?.displayName
    || data?.name
    || data?.body?.name

  if (nama) {
    return res.json({
      status: true,
      result: { wallet: 'DANA', nomor: `+${hp}`, nama, terdaftar: true }
    })
  }

  // fallback: cek via saweria yang pakai DANA
  return await cekDanaViaSaweria(hp, res)
}

async function cekDanaViaSaweria(hp: string, res: Response) {
  try {
    const { data } = await axios.get(
      `https://saweria.co/api/payment/check-dana?phone=${hp}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Origin': 'https://saweria.co',
          'Referer': 'https://saweria.co/',
        },
        timeout: 8000,
        validateStatus: () => true,
      }
    )
    const nama = data?.data?.name || data?.name || data?.result?.name
    if (nama) {
      return res.json({ status: true, result: { wallet: 'DANA', nomor: `+${hp}`, nama, terdaftar: true } })
    }
  } catch {}

  return res.json({ status: false, message: `Nomor +${hp} tidak terdaftar di DANA atau endpoint tidak merespons 😭` })
}

// ===================== OVO =====================
async function cekOvo(hp: string, res: Response) {
  // cek via Tokopedia OVO inquiry
  const { data } = await axios.post(
    'https://gql.tokopedia.com/graphql/OVOCheckEligibility',
    [{
      operationName: 'OVOCheckEligibility',
      variables: { phoneNumber: hp },
      query: `query OVOCheckEligibility($phoneNumber: String!) {
        payment_ovo_check_eligibility(input: {phone_number: $phoneNumber}) {
          data { masked_name phone_number is_registered }
        }
      }`
    }],
    {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': 'https://www.tokopedia.com',
        'Referer': 'https://www.tokopedia.com/',
        'x-tkpd-akamai': 'true',
      },
      timeout: 10000,
      validateStatus: () => true,
    }
  )

  const ovoData = data?.[0]?.data?.payment_ovo_check_eligibility?.data
  if (ovoData?.is_registered) {
    return res.json({
      status: true,
      result: {
        wallet: 'OVO',
        nomor: `+${hp}`,
        nama: ovoData.masked_name || '-',
        terdaftar: true
      }
    })
  }

  return res.json({ status: false, message: `Nomor +${hp} tidak terdaftar di OVO atau tidak dapat dicek saat ini 😭` })
}

// ===================== GOPAY =====================
async function cekGopay(hp: string, res: Response) {
  // cek via Tokopedia GoPay inquiry
  const { data } = await axios.post(
    'https://gql.tokopedia.com/graphql/GopayCheckAccount',
    [{
      operationName: 'GopayCheckAccount',
      variables: { phoneNumber: `+${hp}` },
      query: `query GopayCheckAccount($phoneNumber: String!) {
        gopayCheckAccount(input: {phoneNumber: $phoneNumber}) {
          data { maskedName isRegistered }
        }
      }`
    }],
    {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': 'https://www.tokopedia.com',
        'Referer': 'https://www.tokopedia.com/',
        'x-tkpd-akamai': 'true',
      },
      timeout: 10000,
      validateStatus: () => true,
    }
  )

  const gopayData = data?.[0]?.data?.gopayCheckAccount?.data
  if (gopayData?.isRegistered) {
    return res.json({
      status: true,
      result: {
        wallet: 'GoPay',
        nomor: `+${hp}`,
        nama: gopayData.maskedName || '-',
        terdaftar: true
      }
    })
  }

  // fallback: gojek direct
  try {
    const r2 = await axios.post(
      'https://api.gojek.com/gophp/v2/gopay/v2/account/inquiry',
      { phone_number: `+${hp}` },
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'GoPayApp/3.0 (Android)',
          'app-id': 'com.gojek.app',
        },
        timeout: 8000,
        validateStatus: () => true,
      }
    )
    const nama = r2.data?.data?.name || r2.data?.name
    if (nama) {
      return res.json({ status: true, result: { wallet: 'GoPay', nomor: `+${hp}`, nama, terdaftar: true } })
    }
  } catch {}

  return res.json({ status: false, message: `Nomor +${hp} tidak terdaftar di GoPay atau tidak dapat dicek saat ini 😭` })
}

// ===================== SHOPEEPAY =====================
async function cekShopee(hp: string, res: Response) {
  const { data } = await axios.post(
    'https://shopee.co.id/api/v4/account/check_account_by_phone/',
    new URLSearchParams({ phone_number: `+${hp}` }),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36',
        'Referer': 'https://shopee.co.id/',
        'X-Requested-With': 'XMLHttpRequest',
      },
      timeout: 10000,
      validateStatus: () => true,
    }
  )

  // shopee return error 0 = ada, error 4 = ga ada
  const err = data?.error
  const nama = data?.data?.name || data?.data?.username

  if (err === 0 || nama) {
    return res.json({
      status: true,
      result: {
        wallet: 'ShopeePay',
        nomor: `+${hp}`,
        nama: nama || '-',
        terdaftar: true
      }
    })
  }

  return res.json({ status: false, message: `Nomor +${hp} tidak terdaftar di ShopeePay 😭` })
}

// ===================== LINKAJA =====================
async function cekLinkaja(hp: string, res: Response) {
  const { data } = await axios.post(
    'https://api.linkaja.id/v1/merchant/transfer/inquiry',
    { phoneNumber: hp },
    {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'LinkAja/5.0 (Android)',
        'Authorization': 'Basic ' + Buffer.from('linkaja:linkaja').toString('base64'),
      },
      timeout: 10000,
      validateStatus: () => true,
    }
  )

  const nama = data?.data?.name || data?.name || data?.result?.name
  if (nama) {
    return res.json({
      status: true,
      result: { wallet: 'LinkAja', nomor: `+${hp}`, nama, terdaftar: true }
    })
  }

  // fallback via tcash
  try {
    const r2 = await axios.get(
      `https://api.linkaja.id/v2/customer/inquiry?msisdn=${hp}`,
      {
        headers: { 'User-Agent': 'LinkAja/5.0', 'Accept': 'application/json' },
        timeout: 8000,
        validateStatus: () => true,
      }
    )
    const n2 = r2.data?.data?.name || r2.data?.name
    if (n2) {
      return res.json({ status: true, result: { wallet: 'LinkAja', nomor: `+${hp}`, nama: n2, terdaftar: true } })
    }
  } catch {}

  return res.json({ status: false, message: `Nomor +${hp} tidak terdaftar di LinkAja atau tidak dapat dicek saat ini 😭` })
}
