import { Request, Response } from "express"
import axios from "axios"

export default async function cekipHandler(req: Request, res: Response) {
  const ip = req.query.ip as string

  if (!ip || ip.trim() === "") {
    return res.status(400).json({ status: false, message: "Parameter 'ip' wajib diisi. Contoh: ?ip=36.83.91.230" })
  }

  try {
    const response = await axios.get(`https://www.ip2location.com/${encodeURIComponent(ip)}`, {
      timeout: 15000,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
    })

    const html = response.data as string

    const ambil = (label: string): string => {
      const regex = new RegExp(
        `<strong>\\s*${label}[\\s\\S]*?<\\/strong>[\\s\\S]*?<td[^>]*>(.*?)<\\/td>`,
        "i"
      )
      const match = html.match(regex)
      return match ? match[1].replace(/<.*?>/g, "").trim() : "-"
    }

    const data = {
      ip,
      country: ambil("Country"),
      region: ambil("Region"),
      city: ambil("City"),
      coordinates: ambil("Coordinates"),
      isp: ambil("ISP"),
      domain: ambil("Domain"),
      asn: ambil("ASN"),
      local_time: ambil("Local Time"),
      net_speed: ambil("netSpeed"),
      idd_area_code: ambil("iddAreaCode"),
      zip_code: ambil("zipCode"),
      weather: ambil("Weather"),
      mobile_carrier: ambil("Mobile Carrier"),
      mobile_country: ambil("Mobile Country"),
      mobile_network: ambil("Mobile Network"),
      timezone: ambil("Olson"),
    }

    if (!data.country || data.country === "-") {
      return res.status(400).json({ status: false, message: "IP tidak valid atau data tidak ditemukan" })
    }

    res.json({ status: true, data })
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message })
  }
}
