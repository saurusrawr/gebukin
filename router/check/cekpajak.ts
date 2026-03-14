import { Request, Response } from 'express'
import axios from 'axios'

// support semua provinsi via samsat online
const PROVINSI_MAP: Record<string, string> = {
  'jawa barat': 'jabar', 'jabar': 'jabar',
  'jawa timur': 'jatim', 'jatim': 'jatim',
  'jawa tengah': 'jateng', 'jateng': 'jateng',
  'dki jakarta': 'jakarta', 'jakarta': 'jakarta',
  'banten': 'banten',
  'bali': 'bali',
  'sulawesi selatan': 'sulsel', 'sulsel': 'sulsel',
  'sumatera utara': 'sumut', 'sumut': 'sumut',
  'kalimantan timur': 'kaltim', 'kaltim': 'kaltim',
  'riau': 'riau',
}

export default async (req: Request, res: Response) => {
  const { plat, provinsi } = req.query as Record<string, string>
  if (!plat) return res.status(400).json({ status: false, message: 'Parameter plat wajib diisi 😭 Contoh: B1234XYZ' })

  const platBersih = plat.replace(/\s+/g, '').toUpperCase()
  const provKey = (provinsi || '').toLowerCase()

  try {
    // cek pajak via e-samsat
    const { data } = await axios.post(
      'https://e-samsat.id/api/cek',
      { plat: platBersih },
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://e-samsat.id/',
        },
        timeout: 10000,
        validateStatus: () => true,
      }
    )

    if (data?.status === true && data?.data) {
      const d = data.data
      return res.json({
        status: true,
        result: {
          plat: platBersih,
          merk: d.merk || '-',
          model: d.model || '-',
          warna: d.warna || '-',
          tahun: d.tahun || '-',
          nomorRangka: d.no_rangka || '-',
          nomorMesin: d.no_mesin || '-',
          pokokPajak: d.pokok ? `Rp ${Number(d.pokok).toLocaleString('id-ID')}` : '-',
          denda: d.denda ? `Rp ${Number(d.denda).toLocaleString('id-ID')}` : 'Rp 0',
          totalPajak: d.total ? `Rp ${Number(d.total).toLocaleString('id-ID')}` : '-',
          berlakuSampai: d.berlaku_sampai || '-',
          statusPajak: d.status_pajak || '-',
        }
      })
    }

    // fallback scraping samsat per provinsi
    const provCode = PROVINSI_MAP[provKey] || platBersih.match(/^([A-Z]{1,2})/)?.[1] || ''
    const scraped = await scrapeSamsat(platBersih, provCode)
    if (scraped) return res.json({ status: true, result: { plat: platBersih, ...scraped } })

    return res.status(404).json({ status: false, message: 'Data pajak tidak ditemukan. Pastikan plat nomor benar 😭' })
  } catch (e: any) {
    res.status(500).json({ status: false, message: e.message })
  }
}

async function scrapeSamsat(plat: string, prov: string): Promise<any | null> {
  try {
    const kode = plat.match(/^([A-Z]{1,2})\d/)?.[1] || ''
    const url = `https://samsat-pkb2.jakarta.go.id/INFO_PKB2`

    const { data } = await axios.post(url,
      new URLSearchParams({ no_pol: plat, kd_status: '1' }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0',
          'Referer': url,
        },
        timeout: 8000,
        validateStatus: () => true,
      }
    )

    if (typeof data === 'object' && data?.merk) {
      return {
        merk: data.merk || '-',
        model: data.model || '-',
        warna: data.warna || '-',
        tahun: data.tahun || '-',
        pokokPajak: data.swdkllj ? `Rp ${Number(data.pkb).toLocaleString('id-ID')}` : '-',
        totalPajak: data.total ? `Rp ${Number(data.total).toLocaleString('id-ID')}` : '-',
        berlakuSampai: data.tgl_akhir || '-',
      }
    }
    return null
  } catch {
    return null
  }
}
