import { Request, Response } from "express"
import axios from "axios"
import * as cheerio from "cheerio"

async function scrape(nama1: string, nama2: string) {
  const response = await axios.get(
    `https://primbon.com/kecocokan_nama_pasangan.php?nama1=${nama1}&nama2=${nama2}&proses=+Submit%21+`,
    {
      timeout: 30000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    },
  )

  const $ = cheerio.load(response.data)
  const fetchText = $("#body").text()

  try {
    return {
      nama_anda: nama1,
      nama_pasangan: nama2,
      sisi_positif: fetchText.split("Sisi Positif Anda: ")[1].split("Sisi Negatif Anda: ")[0].trim(),
      sisi_negatif: fetchText.split("Sisi Negatif Anda: ")[1].split("< Hitung Kembali")[0].trim(),
      gambar: "https://primbon.com/ramalan_kecocokan_cinta2.png",
      catatan: "Untuk melihat kecocokan jodoh dengan pasangan, dapat dikombinasikan dengan primbon Ramalan Jodoh (Jawa), Ramalan Jodoh (Bali), numerologi Kecocokan Cinta, Ramalan Perjalanan Hidup Suami Istri, dan makna dari Tanggal Jadian/Pernikahan.",
    }
  } catch {
    throw new Error("Gagal mengambil data, periksa input yang dimasukkan")
  }
}

export default async function cocokPasanganHandler(req: Request, res: Response) {
  const nama1 = req.query.nama1 as string
  const nama2 = req.query.nama2 as string

  if (!nama1 || !nama2) {
    return res.status(400).json({ status: false, message: "Parameter 'nama1' dan 'nama2' wajib diisi" })
  }

  try {
    const data = await scrape(nama1.trim(), nama2.trim())
    res.json({ status: true, data })
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message })
  }
}
