import { Request, Response } from "express"
import axios from "axios"

// api key pastebin, encode base64 biar ga keliatan mentah
const KEY_B64 = "UUdOMXJlQ2FnWWhXdFF2LUtkc01wYV9tX2lkbzVpM18="
const API_KEY = Buffer.from(KEY_B64, 'base64').toString('utf-8')
const ENDPOINT = "https://pastebin.com/api/api_post.php"

export default async function pastebinHandler(req: Request, res: Response) {
  // bisa via GET atau POST
  const code = String(req.query.code || req.body?.code || "").trim()
  const title = String(req.query.title || req.body?.title || "Upload").trim()

  if (!code) {
    return res.status(400).json({
      status: false,
      message: "parameter 'code' wajib diisi (isi konten yang mau diupload)"
    })
  }

  try {
    const payload = new URLSearchParams({
      api_dev_key: API_KEY,
      api_option: 'paste',
      api_paste_code: code,
      api_paste_private: '0',
      api_paste_name: title,
      api_paste_expire_date: '10M', // expired 10 menit
      api_paste_format: 'text'
    })

    const { data } = await axios.post(ENDPOINT, payload, { timeout: 10000 })

    // kalo berhasil response nya url langsung
    if (typeof data === 'string' && data.startsWith('https://pastebin.com/')) {
      const paste_id = data.split('/').pop()
      return res.json({
        status: true,
        id: paste_id,
        url: data,
        raw: `https://pastebin.com/raw/${paste_id}`,
        title,
        expiry: '10 Minutes',
        created_at: new Date().toISOString()
      })
    }

    // kalo ditolak pastebin kasih pesan error
    res.status(422).json({ status: false, message: `pastebin nolak: ${data}` })
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message })
  }
  }
