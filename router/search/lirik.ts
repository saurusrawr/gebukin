import { Request, Response } from "express"
import axios from "axios"

export default async function lirikHandler(req: Request, res: Response) {
  const q = String(req.query.q || req.query.title || "").trim()

  if (!q) {
    return res.status(400).json({
      status: false,
      message: "parameter 'q' wajib diisi, contoh: ?q=Lamunan Wahyu F Giri"
    })
  }

  try {
    const { data } = await axios.get(`https://lrclib.net/api/search?q=${encodeURIComponent(q)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36'
      },
      timeout: 10000
    })

    if (!data?.length) {
      return res.status(404).json({ status: false, message: "lirik ga ketemu, coba query lain" })
    }

    const lagu = data[0]
    const lirik_raw = lagu.plainLyrics || lagu.syncedLyrics

    if (!lirik_raw) {
      return res.status(404).json({ status: false, message: "lagunya ada tapi liriknya kosong, zonk" })
    }

    // bersihin tag waktu [00:00.00] dari synced lyrics
    const lirik_bersih = lirik_raw.replace(/\[.*?\]/g, '').trim()

    const durasi = lagu.duration
      ? `${Math.floor(lagu.duration / 60)}:${(lagu.duration % 60).toString().padStart(2, '0')}`
      : 'Unknown'

    res.json({
      status: true,
      title: lagu.trackName,
      artist: lagu.artistName,
      album: lagu.albumName,
      duration: durasi,
      lyrics: lirik_bersih
    })
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message })
  }
}
