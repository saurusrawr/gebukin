import { Request, Response } from "express"
import axios from "axios"

export default async function tricheckHandler(req: Request, res: Response) {
  let msisdn = (req.query.msisdn as string)?.replace(/[^0-9]/g, "")

  if (!msisdn) {
    return res.status(400).json({
      status: false,
      message: "Parameter 'msisdn' wajib diisi. Prefix SIM TRI: 0895–0899",
    })
  }

  if (msisdn.startsWith("08")) {
    msisdn = "62" + msisdn.slice(1)
  }

  if (!/^(6289[5-9])/.test(msisdn)) {
    return res.status(400).json({
      status: false,
      message: "Nomor bukan prefix SIM TRI (0895–0899)",
    })
  }

  try {
    const response = await axios.post(
      "https://tri.co.id/api/v1/information/sim-status",
      {
        action: "MSISDN_STATUS_WEB",
        input1: "",
        input2: "",
        language: "ID",
        msisdn,
      },
      {
        timeout: 15000,
        headers: {
          "Content-Type": "application/json",
          "sec-ch-ua-platform": '"Android"',
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36",
          "Accept": "application/json, text/plain, */*",
          "sec-ch-ua": '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
          "sec-ch-ua-mobile": "?1",
          "Origin": "https://tri.co.id",
          "Sec-Fetch-Site": "same-origin",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Dest": "empty",
          "Referer": "https://tri.co.id/",
          "Accept-Language": "id,en-US;q=0.9,en;q=0.8",
        },
      }
    )

    const result = response.data

    if (!result?.status) {
      return res.status(400).json({ status: false, message: "Nomor tidak valid atau bukan SIM TRI" })
    }

    const data = result.data
    if (!data || data.responseCode !== "00000") {
      return res.status(400).json({ status: false, message: "Nomor tidak valid atau bukan SIM TRI" })
    }

    const now = new Date()
    const endDate = data.actEndDate ? new Date(data.actEndDate) : null
    const remainingDays = endDate && !isNaN(endDate.getTime())
      ? Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : null

    res.json({
      status: true,
      data: {
        msisdn: data.msisdn,
        iccid: data.iccid,
        card_status: data.cardStatus,
        activation_status: data.activationStatus,
        activation_date: data.activationDate || null,
        expiry_date: data.actEndDate || null,
        remaining_days: remainingDays,
        product: data.prodDesc || null,
        region: data.retDistrict || null,
      },
    })
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message })
  }
}
