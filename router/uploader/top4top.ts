import { Request, Response } from "express"
import axios from "axios"
import * as cheerio from "cheerio"
import FormData from "form-data"
import * as multer from "multer"

const BASE = "https://top4top.io"

const header_dasar = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'Origin': BASE,
  'Referer': BASE + '/'
}

async function upload_ke_top4top(buf: Buffer, filename: string): Promise<any> {
  const form = new FormData()
  form.append('file_1_', buf, { filename })
  form.append('submitr', '[ رفع الملفات ]')

  const { data: html } = await axios.post(`${BASE}/index.php`, form, {
    headers: { ...header_dasar, ...form.getHeaders() },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    timeout: 30000
  })

  const $ = cheerio.load(html)
  const hasil: any[] = []

  $('.alert-warning').each((_, el) => {
    const links: any[] = []

    // kumpulin semua link dari input boxes
    $('input.all_boxes').each((_, input) => {
      const val = $(input).val() as string
      if (!val) return

      if (val.includes('[url=') && val.includes('[img]')) {
        links.push({ type: 'forum_bbcode', url: val })
      } else if (val.includes('[url=')) {
        links.push({ type: 'forum_link', url: val })
      } else if (/https:\/\/[a-z]\.top4top\.io\/p_\w+\.\w+/.test(val)) {
        links.push({ type: 'direct_image', url: val })
      } else if (/https:\/\/[a-z]\.top4top\.io\/s_\w+\.\w+/.test(val)) {
        links.push({ type: 'thumbnail', url: val })
      } else if (val.includes('/del')) {
        links.push({ type: 'delete', url: val })
      } else {
        links.push({ type: 'other', url: val })
      }
    })

    const html_el = $(el).html() || ''
    const thumb_match = html_el.match(/<img src="([^"]+)"[^>]*class="thumb_img_tag"[^>]*>/)
    const del_match = html_el.match(/value="(https:\/\/top4top\.io\/del[^"]+)"/)

    hasil.push({
      thumbnail: thumb_match?.[1] || null,
      delete_url: del_match?.[1] || null,
      links
    })
  })

  if (!hasil.length) throw new Error("upload gagal atau ga ada hasil dari top4top")
  return hasil
}

// middleware multer buat handle file upload
export const middleware = (multer as any)({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // max 50mb
}).single('file')

export default async function top4topHandler(req: Request, res: Response) {
  const file = (req as any).file

  if (!file) {
    return res.status(400).json({
      status: false,
      message: "file wajib diupload via multipart 'file'"
    })
  }

  try {
    const hasil = await upload_ke_top4top(file.buffer, file.originalname || 'upload.png')

    // ambil direct link buat ditampilin duluan
    const direct = hasil[0]?.links?.find((l: any) => l.type === 'direct_image')?.url || null

    res.json({
      status: true,
      url: direct,
      files: hasil
    })
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message })
  }
}
