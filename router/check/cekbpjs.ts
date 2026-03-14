import { Request, Response } from 'express'
import axios from 'axios'

export default async (req: Request, res: Response) => {
  const { nik } = req.query as Record<string, string>
  if (!nik) return res.status(400).json({ status: false, message: 'Parameter nik wajib diisi 😭' })
  if (!/^\d{16}$/.test(nik)) return res.status(400).json({ status: false, message: 'NIK harus 16 digit angka 😭' })

  try {
    const { data } = await axios.get(
      `https://api.bpjs-kesehatan.go.id/api/peserta/nik/${nik}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 10000,
        validateStatus: () => true,
      }
    )

    if (data?.metaData?.code === '200' && data?.response) {
      const p = data.response
      return res.json({
        status: true,
        result: {
          nik,
          nama: p.nama || '-',
          noKartu: p.noKartu || '-',
          jenisKelamin: p.sex === 'L' ? 'Laki-laki' : p.sex === 'P' ? 'Perempuan' : '-',
          tanggalLahir: p.tglLahir || '-',
          kelas: p.kdKelas ? `Kelas ${p.kdKelas}` : '-',
          statusPeserta: p.statusPeserta || '-',
          jenisPeserta: p.jenisPeserta || '-',
          faskes: p.nmFaskes || '-',
          statusAktif: p.aktif === true || p.aktif === '1' ? 'Aktif ✅' : 'Tidak Aktif ❌',
        }
      })
    }

    // fallback scraping via cek-bpjs.com
    const { data: html } = await axios.post(
      'https://www.cek-bpjs.com/',
      new URLSearchParams({ nik }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://www.cek-bpjs.com/',
        },
        timeout: 10000,
      }
    )

    const namaMatch = html.match(/Nama\s*[:\-]\s*<[^>]+>([^<]+)</)
    const noKartuMatch = html.match(/No\.?\s*Kartu\s*[:\-]\s*<[^>]+>([^<]+)</)
    const statusMatch = html.match(/Status\s*[:\-]\s*<[^>]+>([^<]+)</)

    if (namaMatch) {
      return res.json({
        status: true,
        result: {
          nik,
          nama: namaMatch[1]?.trim() || '-',
          noKartu: noKartuMatch?.[1]?.trim() || '-',
          statusAktif: statusMatch?.[1]?.trim() || '-',
        }
      })
    }

    return res.status(404).json({ status: false, message: 'Data BPJS tidak ditemukan untuk NIK ini 😭' })
  } catch (e: any) {
    res.status(500).json({ status: false, message: e.message })
  }
}
