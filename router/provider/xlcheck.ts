import { Request, Response } from "express"
import axios from "axios"

export default async function xlcekHandler(req: Request, res: Response) {
  let number = (req.query.number as string)?.replace(/\D/g, "")

  if (!number) {
    return res.status(400).json({
      status: false,
      message: "Parameter 'number' wajib diisi. Prefix XL: 0817,0818,0819,0877,0878 | AXIS: 0831,0832,0833,0838",
    })
  }

  if (number.startsWith("08")) {
    number = "62" + number.slice(1)
  }

  if (!/^62\d{8,15}$/.test(number)) {
    return res.status(400).json({ status: false, message: "Format nomor tidak valid. Gunakan 08xxxx atau 62xxxx" })
  }

  try {
    const response = await axios.get(
      `https://bendith.my.id/end.php?check=package&number=${number}&version=2`,
      {
        timeout: 15000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36",
        },
      }
    )

    const data = response.data

    if (!data.success) {
      return res.status(400).json({ status: false, message: "Nomor tidak aktif atau bukan pelanggan XL/AXIS" })
    }

    const subs = data.data?.subs_info
    const pack = data.data?.package_info
    const volte = subs?.volte || {}
    const packages = pack?.packages || []

    res.json({
      status: true,
      data: {
        msisdn: subs.msisdn,
        operator: subs.operator,
        id_verified: subs.id_verified,
        network_type: subs.net_type,
        expiry_date: subs.exp_date,
        grace_until: subs.grace_until,
        tenure: subs.tenure,
        volte: {
          device: subs.volte?.device || false,
          area: subs.volte?.area || false,
          simcard: subs.volte?.simcard || false,
        },
        packages: packages.map((p: any) => ({
          name: p.name || null,
          exp_date: p.exp_date || null,
          quota: p.quota || null,
        })),
      },
    })
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message })
  }
}
