import { Request, Response } from "express"
import axios from "axios"
import * as cheerio from "cheerio"

async function scrapeRamalanJodoh(
  nama1: string, tgl1: string, bln1: string, thn1: string,
  nama2: string, tgl2: string, bln2: string, thn2: string,
) {
  const response = await axios({
    method: "post",
    url: "https://www.primbon.com/ramalan_jodoh.php",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
    },
    data: new URLSearchParams({ nama1, tgl1, bln1, thn1, nama2, tgl2, bln2, thn2, submit: "  RAMALAN JODOH >>  " }),
    timeout: 10000,
  })

  const $ = cheerio.load(response.data)

  const extractPerson = (index: number) => {
    const elements = $("#body").contents().filter((_, el) => el.type === "tag" && (el.name === "b" || el.name === "i"))
    const nameIndex = index * 2
    return {
      nama: elements.eq(nameIndex).text().trim(),
      tanggal_lahir: elements.eq(nameIndex + 1).text().replace("Tgl. Lahir:", "").trim(),
    }
  }

  const cleanPredictions = () => {
    let text = $("#body").text()
    text = text.replace(/\(adsbygoogle.*\);/g, "")
    text = text.replace("RAMALAN JODOH", "")
    text = text.replace(/Konsultasi Hari Baik Akad Nikah >>>/g, "")

    const start = text.indexOf("1. Berdasarkan neptu")
    const end = text.indexOf("*Jangan mudah memutuskan")

    if (start !== -1 && end !== -1) text = text.substring(start, end).trim()

    return text.split(/\d+\.\s+/).filter((item) => item.trim()).map((item) => item.trim())
  }

  const peringatanElement = $("#body i").filter((_, el) => $(el).text().includes("Jangan mudah memutuskan")).first()

  return {
    orang_pertama: extractPerson(0),
    orang_kedua: extractPerson(1),
    deskripsi: "Dibawah ini adalah hasil ramalan primbon perjodohan bagi kedua pasangan yang dihitung berdasarkan 6 petung perjodohan dari kitab primbon Betaljemur Adammakna yang disusun oleh Kangjeng Pangeran Harya Tjakraningrat. Hasil ramalan bisa saja saling bertentangan pada setiap petung. Hasil ramalan yang positif (baik) dapat mengurangi pengaruh ramalan yang negatif (buruk), begitu pula sebaliknya.",
    hasil_ramalan: cleanPredictions(),
    peringatan: peringatanElement.length ? peringatanElement.text().split("Konsultasi")[0].trim() : "No specific warning found.",
  }
}

export default async function ramalJodohHandler(req: Request, res: Response) {
  const { nama1, tgl1, bln1, thn1, nama2, tgl2, bln2, thn2 } = req.query as Record<string, string>

  if (!nama1 || !tgl1 || !bln1 || !thn1 || !nama2 || !tgl2 || !bln2 || !thn2) {
    return res.status(400).json({ status: false, message: "Parameter nama1, tgl1, bln1, thn1, nama2, tgl2, bln2, thn2 wajib diisi" })
  }

  try {
    const data = await scrapeRamalanJodoh(nama1, tgl1, bln1, thn1, nama2, tgl2, bln2, thn2)
    res.json({ status: true, data })
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message })
  }
}
