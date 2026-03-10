import { Request, Response } from "express"
import axios from "axios"
import * as cheerio from "cheerio"
import CryptoJS from "crypto-js"

async function ambilToken(): Promise<{ token: string, url: string, cookie: string } | null> {
  try {
    const res = await axios.get("https://allinonedownloader.com/", {
      headers: { "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36" },
      timeout: 10000
    })
    const $ = cheerio.load(res.data)
    const token = $("#token").val() as string
    const url = $("#scc").val() as string
    const cookie = (res.headers['set-cookie'] || []).join('; ')
    if (!token || !url) return null
    return { token, url, cookie }
  } catch {
    return null
  }
}

function generateHash(url: string, token: string): string {
  const key = CryptoJS.enc.Hex.parse(token)
  const iv = CryptoJS.enc.Hex.parse('afc4e290725a3bf0ac4d3ff826c43c10')
  const encrypted = CryptoJS.AES.encrypt(url, key, { iv, padding: CryptoJS.pad.ZeroPadding })
  return encrypted.toString()
}

async function download(url: string) {
  const conf = await ambilToken()
  if (!conf) throw new Error("Gagal mendapatkan token dari web.")

  const { token, url: urlPath, cookie } = conf
  const hash = generateHash(url, token)

  const body = new URLSearchParams()
  body.append('url', url)
  body.append('token', token)
  body.append('urlhash', hash)
// scrapeny pke api aio 
  const res = await axios.post(`https://allinonedownloader.com${urlPath}`, body.toString(), {
    headers: {
      "Accept": "*/*",
      "Accept-Language": "en-US,en;q=0.9,id-ID;q=0.8",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "Cookie": `crs_RCDL_AIO=blah; ${cookie}`,
      "Origin": "https://allinonedownloader.com",
      "Referer": "https://allinonedownloader.com/",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
      "X-Requested-With": "XMLHttpRequest"
    },
    timeout: 15000
  })

  const json = res.data
  return {
    input_url: url,
    source: json.source,
    result: {
      title: json.title,
      duration: json.duration,
      thumbnail: json.thumbnail,
      thumb_width: json.thumb_width,
      thumb_height: json.thumb_height,
      videoCount: json.videoCount,
      imageCount: json.imageCount,
      downloadUrls: json.links
    }
  }
}

export default async function aioHandler(req: Request, res: Response) {
  const { url } = req.query

  if (!url) {
    return res.status(400).json({ status: false, message: "Parameter 'url' wajib diisi" })
  }

  try {
    const data = await download(String(url))
    res.json({ status: true, ...data })
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message })
  }
      }
