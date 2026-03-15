import { Request, Response } from "express"
import axios from "axios"
import * as cheerio from "cheerio"

// mapping ext ke mimetype, males pake library
function get_mime(url: string): string {
  if (!url) return 'unknown'
  const ext = url.split('/').pop()?.split('?')[0]?.split('.').pop()?.toLowerCase() || ''
  const map: Record<string, string> = {
    '7z': 'application/x-7z-compressed',
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed',
    'apk': 'application/vnd.android.package-archive',
    'exe': 'application/x-msdownload',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
    'png': 'image/png', 'gif': 'image/gif',
    'mp3': 'audio/mpeg', 'mp4': 'video/mp4',
    'txt': 'text/plain', 'json': 'application/json',
    'js': 'application/javascript', 'html': 'text/html', 'css': 'text/css'
  }
  return map[ext] || 'application/octet-stream'
}

async function scrape_mediafire(url: string) {
  const { data: html } = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36'
    },
    timeout: 15000
  })

  const $ = cheerio.load(html)

  const title = $('meta[property="og:title"]').attr('content') || '-'
  const thumbnail = $('meta[property="og:image"]').attr('content') || null
  const description = $('meta[property="og:description"]').attr('content') || '-'
  const link_download = $('#downloadButton').attr('href') || null
  const size_raw = $('#downloadButton').text().trim()
  const size = size_raw.replace('Download (', '').replace(')', '').trim()

  if (!link_download) throw new Error("link download ga ketemu, mungkin file dihapus")

  return {
    title,
    thumbnail,
    description,
    download: {
      url: link_download,
      size,
      mimetype: get_mime(link_download)
    }
  }
}

export default async function mediafireHandler(req: Request, res: Response) {
  const url = String(req.query.url || "").trim()

  if (!url) {
    return res.status(400).json({
      status: false,
      message: "parameter 'url' wajib diisi, contoh: ?url=https://www.mediafire.com/file/xxx"
    })
  }

  if (!url.includes('mediafire.com')) {
    return res.status(400).json({
      status: false,
      message: "url harus dari mediafire.com"
    })
  }

  try {
    const hasil = await scrape_mediafire(url)
    res.json({ status: true, ...hasil })
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message })
  }
}
