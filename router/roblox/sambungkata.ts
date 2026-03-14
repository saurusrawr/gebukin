import { Request, Response } from 'express'
import axios from 'axios'

let kataCache: string[] = []
let lastFetch = 0
const CACHE_TTL = 60 * 60 * 1000

const DATA_URL = 'https://raw.githubusercontent.com/saurusrawr/penting/main/sambungkata.txt'

async function getKata(): Promise<string[]> {
  const now = Date.now()
  if (kataCache.length > 0 && now - lastFetch < CACHE_TTL) return kataCache

  const { data } = await axios.get(DATA_URL, { timeout: 10000, responseType: 'text' })
  kataCache = String(data).split('\n').map(k => k.trim().toLowerCase()).filter(k => k.length > 0)
  lastFetch = now
  console.log(`[SambungKata] Loaded ${kataCache.length} kata`)
  return kataCache
}

export default async (req: Request, res: Response) => {
  try {
    const { huruf, akhiran, min, max, limit } = req.query as Record<string, string>

    if (!huruf) return res.status(400).json({ status: false, message: 'Parameter huruf wajib diisi 😭 Contoh: huruf=n' })

    const awalan = huruf.trim().toLowerCase()
    if (!/^[a-z]$/.test(awalan)) {
      return res.status(400).json({ status: false, message: 'Huruf awalan harus 1 karakter a-z 😭' })
    }

    // akhiran opsional — kalau diisi validasi juga
    let akhiranBersih: string | null = null
    if (akhiran && akhiran.trim()) {
      akhiranBersih = akhiran.trim().toLowerCase()
      if (!/^[a-z]$/.test(akhiranBersih)) {
        return res.status(400).json({ status: false, message: 'Huruf akhiran harus 1 karakter a-z 😭' })
      }
    }

    const minLen   = min   ? Math.max(1, parseInt(min))     : 2
    const maxLen   = max   ? Math.min(20, parseInt(max))    : 15
    const limitNum = limit ? Math.min(100, parseInt(limit)) : 20

    const kamus = await getKata()

    const hasil = kamus.filter(k => {
      if (!k.startsWith(awalan)) return false
      if (k.length < minLen || k.length > maxLen) return false
      if (akhiranBersih && k[k.length - 1] !== akhiranBersih) return false
      return true
    })

    const sample = hasil.sort(() => Math.random() - 0.5).slice(0, limitNum)

    return res.json({
      status: true,
      result: {
        awalan: awalan.toUpperCase(),
        akhiran: akhiranBersih ? akhiranBersih.toUpperCase() : null,
        totalDitemukan: hasil.length,
        ditampilkan: sample.length,
        kata: sample,
      }
    })

  } catch (e: any) {
    res.status(500).json({ status: false, message: e.message })
  }
}
