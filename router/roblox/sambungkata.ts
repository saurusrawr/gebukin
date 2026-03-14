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

// GET /api/tools/sambungkata?huruf=n&min=3&max=8&limit=20
export default async (req: Request, res: Response) => {
  try {
    const { huruf, min, max, limit } = req.query as Record<string, string>

    if (!huruf) return res.status(400).json({ status: false, message: 'Parameter huruf wajib diisi 😭 Contoh: huruf=n' })

    const hurufBersih = huruf.trim().toLowerCase()
    if (!/^[a-z]$/.test(hurufBersih)) {
      return res.status(400).json({ status: false, message: 'Huruf harus 1 karakter a-z 😭' })
    }

    const minLen   = min   ? Math.max(1, parseInt(min))        : 2
    const maxLen   = max   ? Math.min(20, parseInt(max))       : 15
    const limitNum = limit ? Math.min(100, parseInt(limit))    : 20

    const kamus = await getKata()

    const hasil = kamus.filter(k =>
      k.startsWith(hurufBersih) &&
      k.length >= minLen &&
      k.length <= maxLen
    )

    const sample = hasil.sort(() => Math.random() - 0.5).slice(0, limitNum)

    return res.json({
      status: true,
      result: {
        huruf: hurufBersih.toUpperCase(),
        totalDitemukan: hasil.length,
        ditampilkan: sample.length,
        kata: sample,
      }
    })

  } catch (e: any) {
    res.status(500).json({ status: false, message: e.message })
  }
}
