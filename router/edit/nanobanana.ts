import { Request, Response } from "express"
import axios from "axios"
import FormData from "form-data"

const BASE_URL = "https://www.nanobana.net"

// cookie encode base64 biar ga keliatan mentah
const COOKIE_B64 = "X2dhPUdBMS4xLjMwOTIxODY0MS4xNzY5Mzg3Nzk3OyBfX0hvc3QtYXV0aGpzLmNzcmYtdG9rZW49MTdmZTUxMzcwNzkxZjhhODk1NGU5N2YyOWUwMjE1ZTcxOWM0ZWU4MjYxYjc1MTJjMzM4ZjdkZDljMTk1OWU3NCU3Q2ZmM2M5YjI2ODdlY2M3ZWY4ODhkNjcwMmZiNzcwYjc0YWFjZDE0YTY2M2E1OTBkMWZiNjk5NjhjYWQ5MzIyNzk7IF9fU2VjdXJlLWF1dGhqcy5zZXNzaW9uLXRva2VuPWV5SmhiR2NpT2lKa2FYSWlMQ0psYm1NaU9pSkJNalUyUTBKQ0xVaFROVEV5SWl3aWEybGtJam9pU1dSbWJFeG9jREpOTFhoQmRWZDVlamhJTlV4MlNrOVZNak5qYVhwYVowb3hUbGhIV1VGTlVVYzBNR1kwYlc1WFpuRnRkV1p5V25GWWJITTJTRlpJTFVabGNEbHZhVWs1ZFRkSWJIY2lmUS4uMHJTZzlDSWdHUHlzZkk3NXBrbElidy5IR1dRWDFXUkx5emg2SVhEcElJLTZyNVdYd1FoZUE5TFY0dk0zSWlNTVQtSzFEOTZiVDFxTWJaV0VhVUxfNFdNWlY4c3VweXd6ektKWEtBZWF0X04temoyOXktVUNEN20xMXM3WWFpSHpqaDhfWVE1VFdlQXdlNUM4Z2xrS0Q4aWJSWXlyekpITXhIYzFaX2hXakM4ZnpKWEEzVEl2WmdNLTNTal8xSE45aTN1aWNxWGhqNERDVHl3WXl4Z29WWXJTU1JCNFRLM0ZXNFhJZnZrZE9UcVBFM2VZZkZiV2YyOVNISnR4MnI5bHdXMlJCMGpwN3ZtWVpTRzR3VENSZDh2dnhscUVRRkVya2FnYkN2am9OUk53a0pLc2JQSGFTOFZLZEF4UlJnZVc0UU5xY2NSZmZPVlc4eGdWQ1VZWXVLdGc2OVdXZGFfY1MxcEZMYXhfeU96bS1zVFlTMFRPZC1pXzJuQTVRVENNVmN6OHRpRmF0Qlhna...".substring(0, 100)
// decode cookie dari env atau hardcode
const COOKIE = process.env.NANOBANA_COOKIE || `_ga=GA1.1.309218641.1769387797; __Secure-authjs.session-token=eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2Q0JDLUhTNTEyIiwia2lkIjoiSWRmbEhwMk0teEF1V3l6Nkg1bHZrRHdOc0ZiM3BBOHVvMjNjaXhaZ1MxT1hHWUFNUUc0MGY0bW5XZnFtdWZyWnFYbHM2SFZILUZncDlvaUk5dTdIbHcifQ..0rSg9CIgGPysfI75pklIbw.HGWQX1WRLyzhg6IXDpiI-6r5WXwQheA9LV4vM3IiMMT-K1D96bT1qMbZWEaUL_4WMZV8supywxzJKQaEat_N-zj529y-UCD7m11s7yLaiHzjh8_YQ5TWeAwe5C8glkKD8ibRYyrzJHMxHc1z_hWjC8fzJXA3TIvZgM-3Sj_1HN9i3uicqxHj4DCTywYixgoVYrsRRB4Tez9pLDF4Bc6IOzncS4i9z6fYKfzkyB4UU1mIn-O0XMXe6B-iXaU_iTAjT_yolrcorTTaC6Mz6dctFe1DV0uF-MXpYnjUWJUG6WU994gnZoHetc-ZWupHEiowWvWAJOlMvK36tEDx2_qHJ9lVSV1jgOIM7DNZCoKU1CF1MuKg_CjOWK0zwPUr5hMCxzmOiJlAxOFP33ihoo3ICra5yJiqQTwrz-raUPvxlYJ-O8wb6hYaGGxyWlDzznk_ktGNha0kA6VVagX5RBEtXJMJKW-lMWr320Axkcs1PeoFFZZRjgeW4QNqccRffOVW8xgVCUYYuKtg69WWda_cS1pFLax_yOzm-sTYS0TOd-i_2nA5QTCMVcz8tiFatBXgEAgByXjn1himNuHlWiyDxJh-gXp4zytidKhTg46YCNGmSrYpdcVDN7kXx0Mqb9VaXGl1VUonM5PkAhMQv8XZdha2KbUifNZhAUsqPAX4UEiTDA4wiKvazwpl8zUqJC3wFxyMqXLBsemyY2Jfl6FjTr6b7ihGqm24FKZZhJyKcOKk.lzxeJe36s5fppqa_cppFR4J7cqHI0LrrjDeFMR0ksi8`

const header_nano = {
  'authority': 'www.nanobana.net',
  'accept': '*/*',
  'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'content-type': 'application/json',
  'origin': BASE_URL,
  'referer': `${BASE_URL}/`,
  'sec-ch-ua': '"Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"',
  'sec-ch-ua-mobile': '?1',
  'sec-ch-ua-platform': '"Android"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
  'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36',
  'cookie': COOKIE
}

// donlot gambar dari url terus upload ke nanobana
async function upload_gambar(url: string): Promise<string> {
  const { data: img_data, headers: img_h } = await axios.get(url, {
    responseType: 'arraybuffer', timeout: 15000
  })
  const mime = img_h['content-type']?.split(';')[0] || 'image/png'
  const ext = mime.includes('png') ? 'png' : mime.includes('jpg') || mime.includes('jpeg') ? 'jpg' : 'png'

  const form = new FormData()
  form.append('file', Buffer.from(img_data), {
    filename: `image.${ext}`,
    contentType: mime
  })

  const { data } = await axios.post(`${BASE_URL}/api/upload/image`, form, {
    headers: {
      ...header_nano,
      ...form.getHeaders(),
      'content-type': 'multipart/form-data'
    },
    timeout: 30000,
    maxBodyLength: Infinity
  })

  if (!data?.url) throw new Error("upload gambar ke nanobana gagal")
  return data.url
}

// buat task generate
async function buat_task(img_url: string, prompt: string): Promise<string> {
  const { data } = await axios.post(`${BASE_URL}/api/nano-banana-pro/generate`, {
    prompt,
    image_input: [img_url],
    output_format: 'png',
    aspect_ratio: '1:1',
    resolution: '1K'
  }, {
    headers: header_nano,
    timeout: 30000
  })

  if (!data?.data?.taskId) throw new Error("gagal buat task nanobana")
  return data.data.taskId
}

// polling sampe selesai, max 2 menit
async function tunggu_hasil(task_id: string, prompt: string): Promise<string> {
  for (let i = 0; i < 60; i++) {
    try {
      const { data } = await axios.get(`${BASE_URL}/api/nano-banana-pro/task/${task_id}`, {
        headers: header_nano,
        params: { save: 1, prompt },
        timeout: 15000
      })

      const d = data?.data
      if (d?.status === 'completed' && d?.provider_state === 'success') {
        return d.savedFiles?.[0]?.publicUrl || d.result?.images?.[0]?.url
      }
    } catch {}

    await new Promise(r => setTimeout(r, 2000))
  }
  throw new Error("timeout, task ga selesai dalam 2 menit")
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
    // upload gambar dari url
    const img_url = await upload_gambar(url)

    // buat task
    const task_id = await buat_task(img_url, prompt)

    // tunggu hasil
    const hasil_url = await tunggu_hasil(task_id, prompt)

    res.json({
      status: true,
      prompt,
      result: hasil_url
    })
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message })
  }
}
