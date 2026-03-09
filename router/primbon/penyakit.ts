import { Request, Response } from "express"
import axios from "axios"
import * as cheerio from "cheerio"

async function scrapeCekPotensiPenyakit(tgl: string, bln: string, thn: string) {
  const { data } = await axios({
    url: "https://primbon.com/cek_potensi_penyakit.php",
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    },
    data: new URLSearchParams({ tanggal: tgl, bulan: bln, tahun: thn, hitung: " Submit! " }),
    timeout: 30000,
  })

  const $ = cheerio.load(data)
  const fetchText = $("#body")
    .text()
    .replace(/\s{2,}/g, " ")
    .replace(/[\n\r\t]+/g, " ")
    .replace(/\(adsbygoogle\s*=\s*window\.adsbygoogle\s*\|\|\s*\[\]\)\.push\(\{\}\); /g, "")
    .replace(/<<+\s*Kembali/g, "")
    .trim()

  if (!fetchText.includes("CEK POTENSI PENYAKIT (METODE PITAGORAS)")) {
    throw new Error("Data tidak ditemukan atau format tanggal tidak valid")
  }

  return {
    analisa: fetchText.split("CEK POTENSI PENYAKIT (METODE PITAGORAS)")[1].split("Sektor yg dianalisa:")[0].trim(),
    sektor: fetchText.split("Sektor yg dianalisa:")[1].split("Anda tidak memiliki elemen")[0].trim(),
    elemen: "Anda tidak memiliki elemen " + fetchText.split("Anda tidak memiliki elemen")[1].split("*")[0].trim(),
    catatan: "Potensi penyakit harus dipandang secara positif. Sakit pada daftar tidak berarti anda akan mengalami semuanya. Anda mungkin hanya akan mengalami 1 atau 2 macam penyakit. Pencegahan adalah yang terbaik, makanan yang sehat, olahraga teratur, istirahat yang cukup, hidup bahagia, adalah resep paling manjur untuk menghindari segala penyakit.",
  }
}

export default async function penyakitHandler(req: Request, res: Response) {
  const tgl = req.query.tgl as string
  const bln = req.query.bln as string
  const thn = req.query.thn as string

  if (!tgl || !bln || !thn) {
    return res.status(400).json({ status: false, message: "Parameter 'tgl', 'bln', dan 'thn' wajib diisi" })
  }

  try {
    const data = await scrapeCekPotensiPenyakit(tgl.trim(), bln.trim(), thn.trim())
    res.json({ status: true, data })
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message })
  }
}
