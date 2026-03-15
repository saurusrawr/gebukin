import { Request, Response } from "express"
import axios from "axios"
import * as crypto from "crypto"
import CryptoJS from "crypto-js"

const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCwlO+boC6cwRo3UfXVBadaYwcX
0zKS2fuVNY2qZ0dgwb1NJ+/Q9FeAosL4ONiosD71on3PVYqRUlL5045mvH2K9i8b
AFVMEip7E6RMK6tKAAif7xzZrXnP1GZ5Rijtqdgwh+YmzTo39cuBCsZqK9oEoeQ3
r/myG9S+9cR5huTuFQIDAQAB
-----END PUBLIC KEY-----`

const APP_ID = "aifaceswap"
const U_ID = "1H5tRtzsBkqXcaJ"
const THEME_VERSION = "83EmcUoQTUv50LhNx0VrdcK8rcGexcP35FcZDcpgWsAXEyO4xqL5shCY6sFIWB2Q"

// bikin random string buat key aes
function acak_string(len: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let res = ""
  for (let i = 0; i < len; i++) res += chars.charAt(Math.floor(Math.random() * chars.length))
  return res
}

// enkripsi aes cbc, bombardiro crocodilo
function aes_enc(data: string, key: string): string {
  const k = CryptoJS.enc.Utf8.parse(key)
  return CryptoJS.AES.encrypt(data, k, {
    iv: k,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  }).toString()
}

// enkripsi rsa buat x-guide
function rsa_enc(data: string): string {
  return crypto.publicEncrypt(
    { key: PUBLIC_KEY, padding: crypto.constants.RSA_PKCS1_PADDING },
    Buffer.from(data, 'utf8')
  ).toString('base64')
}

// generate crypto headers, wajib tiap request
function gen_headers(type: string, fp: string) {
  const now = Math.floor(new Date(
    new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate(),
    new Date().getUTCHours(), new Date().getUTCMinutes(), new Date().getUTCSeconds()
  ).getTime() / 1000)
  const uuid = crypto.randomUUID()
  const rand_key = acak_string(16)
  const s = rsa_enc(rand_key)
  const sign_str = type === 'upload'
    ? `${APP_ID}:${uuid}:${s}`
    : `${APP_ID}:${U_ID}:${now}:${uuid}:${s}`

  return {
    'fp': fp,
    'fp1': aes_enc(`${APP_ID}:${fp}`, rand_key),
    'x-guide': s,
    'x-sign': aes_enc(sign_str, rand_key),
    'x-code': Date.now().toString()
  }
}

const base_header = {
  'Accept': 'application/json, text/plain, */*',
  'Content-Type': 'application/json',
  'origin': 'https://live3d.io',
  'referer': 'https://live3d.io/',
  'theme-version': THEME_VERSION
}

// upload gambar ke live3d dulu biar dapet url internal
async function upload_gambar(buf: Buffer, mime: string, fp: string): Promise<string> {
  const boundary = '----FormBoundary' + acak_string(12)
  const part1 = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="image.jpg"\r\nContent-Type: ${mime}\r\n\r\n`
  )
  const part2 = Buffer.from(`\r\n--${boundary}--\r\n`)
  const body = Buffer.concat([part1, buf, part2])

  const { data } = await axios.post('https://app.live3d.io/aitools/of/upload', body, {
    headers: {
      ...base_header,
      'content-type': `multipart/form-data; boundary=${boundary}`,
      ...gen_headers('upload', fp)
    },
    timeout: 30000,
    maxBodyLength: Infinity
  })

  if (data.code !== 200) throw new Error(`upload gagal: ${JSON.stringify(data)}`)
  return data.data.url
}

// buat task edit gambar
async function buat_task(img_url: string, prompt: string, fp: string): Promise<string> {
  const { data } = await axios.post('https://app.live3d.io/aitools/of/create', {
    fn_name: "demo-image-editor",
    call_type: 3,
    input: {
      model: "nano_banana_pro",
      source_images: [img_url], // gambar user
      prompt,
      aspect_radio: "1:1",
      request_from: 9
    },
    request_from: 9,
    origin_from: "8f3f0c7387123ae0"
  }, {
    headers: { ...base_header, ...gen_headers('create', fp) },
    timeout: 30000
  })

  if (data.code !== 200) throw new Error(`buat task gagal: ${JSON.stringify(data)}`)
  return data.data.task_id
}

// polling sampe selesai, max 2 menit
async function tunggu_hasil(task_id: string, fp: string): Promise<string> {
  const max_try = 40 // 40x * 3 detik = 2 menit
  for (let i = 0; i < max_try; i++) {
    const { data } = await axios.post('https://app.live3d.io/aitools/of/check-status', {
      task_id,
      fn_name: "demo-image-editor",
      call_type: 3,
      request_from: 9,
      origin_from: "8f3f0c7387123ae0"
    }, {
      headers: { ...base_header, ...gen_headers('check', fp) },
      timeout: 15000
    })

    // status 2 = selesai, skibidi
    if (data.data?.status === 2) {
      return `https://temp.live3d.io/${data.data.result_image}`
    }

    // status 3 = error
    if (data.data?.status === 3) throw new Error("proses gagal di server live3d")

    // tunggu 3 detik sebelum polling lagi
    await new Promise(r => setTimeout(r, 3000))
  }

  throw new Error("timeout, gambar ga selesai setelah 2 menit")
}

export default async function nanobananaHandler(req: Request, res: Response) {
  const url = String(req.query.url || "").trim()
  const prompt = String(req.query.prompt || "Edit gambar ini dengan natural dan realistis").trim()

  if (!url) {
    return res.status(400).json({
      status: false,
      message: "parameter 'url' wajib diisi (url gambar)"
    })
  }

  try {
    // fingerprint unik tiap request
    const fp = crypto.randomBytes(16).toString('hex')

    // donlot gambar user dulu
    const { data: img_data, headers: img_headers } = await axios.get(url, {
      responseType: 'arraybuffer', timeout: 15000
    })
    const mime = img_headers['content-type']?.split(';')[0] || 'image/jpeg'
    const buf = Buffer.from(img_data)

    // upload ke cdn live3d
    const img_url = await upload_gambar(buf, mime, fp)

    // buat task edit
    const task_id = await buat_task(img_url, prompt, fp)

    // tunggu hasil
    const hasil_url = await tunggu_hasil(task_id, fp)

    res.json({
      status: true,
      prompt,
      result: hasil_url
    })
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message })
  }
}
