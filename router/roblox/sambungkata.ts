import { Request, Response } from 'express'
import axios from 'axios'

// cache kata biar ga fetch tiap request
let kataCache: string[] = []
let lastFetch = 0
const CACHE_TTL = 60 * 60 * 1000 // 1 jam

const DATA_URL = 'https://raw.githubusercontent.com/saurusrawr/penting/main/sambungkata.txt'

async function getKata(): Promise<string[]> {
  const now = Date.now()
  if (kataCache.length > 0 && now - lastFetch < CACHE_TTL) return kataCache

  try {
    const { data } = await axios.get(DATA_URL, {
      timeout: 10000,
      responseType: 'text',
    })
    kataCache = String(data)
      .split('\n')
      .map(k => k.trim().toLowerCase())
      .filter(k => k.length > 0)
    lastFetch = now
    console.log(`[SambungKata] Loaded ${kataCache.length} kata`)
    return kataCache
  } catch (e: any) {
    if (kataCache.length > 0) return kataCache // pake cache lama kalau gagal fetch
    throw new Error('Gagal load data kamus: ' + e.message)
  }
}

// GET /api/tools/sambungkata?mode=cek&kata=makan
// GET /api/tools/sambungkata?mode=cari&huruf=n&min=3&max=8&limit=20
// GET /api/tools/sambungkata?mode=info
export default async (req: Request, res: Response) => {
  try {
    const { mode = 'cek', kata, huruf, min, max, limit } = req.query as Record<string, string>

    const kamus = await getKata()

    // === MODE: INFO ===
    if (mode === 'info') {
      return res.json({
        status: true,
        result: {
          totalKata: kamus.length,
          sumber: 'KBBI via fikryfadh/sambungkata',
          modes: [
            { mode: 'cek', desc: 'Cek apakah kata valid di kamus', params: ['kata'] },
            { mode: 'cari', desc: 'Cari kata berdasarkan huruf awal (untuk sambung kata)', params: ['huruf', 'min?', 'max?', 'limit?'] },
            { mode: 'info', desc: 'Info kamus' },
          ],
        }
      })
    }

    // === MODE: CEK ===
    if (mode === 'cek') {
      if (!kata) return res.status(400).json({ status: false, message: 'Parameter kata wajib diisi 😭' })

      const kataBersih = kata.trim().toLowerCase()
      const valid = kamus.includes(kataBersih)
      const hurufAwal = kataBersih[0] || '-'
      const hurufAkhir = kataBersih[kataBersih.length - 1] || '-'

      return res.json({
        status: true,
        result: {
          kata: kataBersih,
          valid,
          keterangan: valid ? '✅ Kata valid ada di kamus KBBI' : '❌ Kata tidak ditemukan di kamus KBBI',
          hurufAwal,
          hurufAkhir,
          panjang: kataBersih.length,
          // bonus: kalau valid, kasih tau bisa disambung ke huruf apa
          sambungKe: valid ? hurufAkhir.toUpperCase() : null,
        }
      })
    }

    // === MODE: CARI ===
    if (mode === 'cari') {
      if (!huruf) return res.status(400).json({ status: false, message: 'Parameter huruf wajib diisi 😭 Contoh: huruf=n' })

      const hurufBersih = huruf.trim().toLowerCase()
      if (!/^[a-z]$/.test(hurufBersih)) {
        return res.status(400).json({ status: false, message: 'Huruf harus 1 karakter a-z 😭' })
      }

      const minLen = min ? Math.max(1, parseInt(min)) : 2
      const maxLen = max ? Math.min(20, parseInt(max)) : 15
      const limitNum = limit ? Math.min(100, parseInt(limit)) : 20

      // filter kata yang diawali huruf tersebut + filter panjang
      const hasil = kamus
        .filter(k =>
          k.startsWith(hurufBersih) &&
          k.length >= minLen &&
          k.length <= maxLen
        )

      // shuffle supaya tiap request beda — ga monoton
      const shuffled = hasil.sort(() => Math.random() - 0.5)
      const sample = shuffled.slice(0, limitNum)

      return res.json({
        status: true,
        result: {
          huruf: hurufBersih.toUpperCase(),
          totalDitemukan: hasil.length,
          ditampilkan: sample.length,
          filterPanjang: `${minLen}-${maxLen} karakter`,
          kata: sample,
        }
      })
    }

    return res.status(400).json({ status: false, message: 'Mode tidak valid. Gunakan: cek / cari / info 😭' })

  } catch (e: any) {
    res.status(500).json({ status: false, message: e.message })
  }
}
