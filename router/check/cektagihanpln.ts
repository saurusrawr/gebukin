import { Request, Response } from "express"
import axios from "axios"

async function scrapeTagihanListrik(nopel: string) {
  const response = await axios.get(
    `https://listrik.okcek.com/dd.php?nopel=${nopel}`,
    {
      timeout: 15000,
      headers: {
        authority: "listrik.okcek.com",
        accept: "application/json, text/javascript, */*; q=0.01",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        referer: `https://listrik.okcek.com/hasil.php?nopel=${nopel}`,
        "sec-ch-ua": '"Not A(Brand";v="8", "Chromium";v="132"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36",
        "x-requested-with": "XMLHttpRequest",
      },
    }
  )

  const rawData = response.data

  if (rawData?.data?.status !== "success") {
    throw new Error("Data tidak ditemukan")
  }

  return {
    jenis_tagihan: rawData.data[0][2],
    no_pelanggan: rawData.data[1][2],
    nama_pelanggan: rawData.data[2][2],
    tarif_daya: rawData.data[3][2],
    bulan_tahun: rawData.data[4][2],
    stand_meter: rawData.data[5][2],
    total_tagihan: rawData.data[6][2],
  }
}

export default async function cektagihanplnHandler(req: Request, res: Response) {
  const nopel = req.query.nopel as string

  if (!nopel || nopel.trim() === "") {
    return res.status(400).json({ status: false, message: "Parameter 'nopel' wajib diisi (nomor pelanggan PLN)" })
  }

  try {
    const data = await scrapeTagihanListrik(nopel.trim())
    res.json({ status: true, data })
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message })
  }
}
