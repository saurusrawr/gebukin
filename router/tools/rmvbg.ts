import { Request, Response } from "express"
import axios from "axios"
import * as crypto from "crypto"
import FormData from "form-data"

const BASE = "https://removal.ai"
const API = "https://api.removal.ai"
const AJAX = "https://removal.ai/wp-admin/admin-ajax.php"

// generate cookies palsu biar keliatan kayak browser beneran
function buat_cookies(): string {
  const acak = (n: number) => crypto.randomBytes(Math.ceil(n/2)).toString('hex').slice(0, n)
  const ts = Date.now()
  const ts10 = ts.toString().slice(0, 10)
  const phpsessid = acak(26)
  const ga1 = `GA1.1.${acak(8)}.${ts10}`
  const ga2 = `GS2.1.s${ts}$o1$g0$t${ts}$j60$l0$h0`
  const ga3 = `GS2.1.s${ts - 1000}$o1$g1$t${ts}$j3$l0$h0`
  return `PHPSESSID=${phpsessid}; lang=en; _ga=${ga1}; _ga_W308RS13QN=${ga2}; _ga_XECZHS4N4G=${ga3}`
}

// ambil webtoken dulu, wajib sebelum upload
async function ambil_token(cookie_str: string): Promise<string> {
  const { data } = await axios.get(`${AJAX}?action=ajax_get_webtoken&security=249c6a42bb`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/145.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Origin': BASE,
      'Referer': BASE + '/upload/',
      'X-Requested-With': 'XMLHttpRequest',
      'Cookie': cookie_str
    },
    timeout: 10000
  })
  if (!data?.success) throw new Error("gagal dapet webtoken dari removal.ai")
  return data.data.webtoken
}

// proses hapus background nya
async function hapus_bg(buf: Buffer, web_token: string, cookie_str: string): Promise<any> {
  const form = new FormData()
  form.append('image_file', buf, { filename: 'image.png' })
  form.append('format', 'png')

  const { data } = await axios.post(`${API}/3.0/remove`, form, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/145.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Origin': BASE,
      'Referer': BASE + '/upload/',
      'X-Requested-With': 'XMLHttpRequest',
      'Cookie': cookie_str,
      'Web-Token': web_token,
      ...form.getHeaders()
    },
    timeout: 30000
  })
  return data
}

export default async function rmvbgHandler(req: Request, res: Response) {
  const url = String(req.query.url || "").trim()

  if (!url) {
    return res.status(400).json({
      status: false,
      message: "parameter 'url' wajib diisi (url gambar)"
    })
  }

  try {
    // donlot gambar user
    const { data: img_data } = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 15000
    })
    const buf = Buffer.from(img_data)

    // bikin cookies baru tiap request
    const cookie_str = buat_cookies()

    // ambil token dulu
    const web_token = await ambil_token(cookie_str)

    // hapus backgroundnya
    const hasil = await hapus_bg(buf, web_token, cookie_str)

    res.json({
      status: true,
      result: hasil
    })
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message })
  }
}
  
