import { Request, Response } from "express"
import axios from "axios"

// api keys gemini, kalo satu limit pindah ke selanjutnyee
const kunci_gemini = [
  "AIzaSyBKCADmlVZEtopWTQhNhRLqF-3U7fz8FVc",
  "AIzaSyC-CY523ZpkUKq0RjyASLfgFBGOlTwSnJw",
  "AIzaSyAoAVYZDGoniROPos9GE8OOwIXmy19XQsQ",
]

// prompt default kalo user males isi
const prompt_default = "Edit gambar ini sesuai permintaan dengan hasil yang natural dan realistis."

async function generate_gambar(foto_buf: Buffer, mime_type: string, prompt_text: string, key_index = 0): Promise<Buffer> {
  if (key_index >= kunci_gemini.length) throw new Error("semua api key gemini limit, coba lagi ntar")

  const api_key = kunci_gemini[key_index]
  const base64_foto = foto_buf.toString("base64")

  try {
    const { data } = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${api_key}`,
      {
        contents: [{
          parts: [
            { text: prompt_text },
            { inlineData: { mimeType: mime_type, data: base64_foto } }
          ]
        }],
        generationConfig: {
          responseModalities: ["Text", "Image"]
        }
      },
      { timeout: 60000 }
    )

    // cari bagian gambar dari response
    const parts = data?.candidates?.[0]?.content?.parts || []
    for (const part of parts) {
      if (part.inlineData?.data) {
        return Buffer.from(part.inlineData.data, "base64")
      }
    }

    throw new Error("gemini ga return gambar, zonk")
  } catch (err: any) {
    // kalo 429 = limit, coba key berikutnya
    if (err.response?.status === 429 || err.response?.status === 403) {
      return generate_gambar(foto_buf, mime_type, prompt_text, key_index + 1)
    }
    throw err
  }
}

export default async function nanobananaHandler(req: Request, res: Response) {
  const { url, prompt } = req.query

  if (!url) {
    return res.status(400).json({
      status: false,
      message: "parameter 'url' wajib diisi (url gambar)"
    })
  }

  const prompt_text = String(prompt || prompt_default).trim()

  try {
    // donlot foto dari url dulu
    const { data: foto_data, headers } = await axios.get(String(url), {
      responseType: "arraybuffer",
      timeout: 15000
    })

    const mime_type = headers["content-type"]?.split(";")?.[0] || "image/jpeg"

    // validasi format, gemini cuma support jpeg/png/webp
    if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(mime_type)) {
      return res.status(400).json({
        status: false,
        message: `format ${mime_type} ga didukung, pake jpeg/png/webp aja`
      })
    }

    const foto_buf = Buffer.from(foto_data)

    // proses pake gemini
    const hasil = await generate_gambar(foto_buf, mime_type, prompt_text)

    res.set("Content-Type", "image/png")
    res.send(hasil)
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message })
  }
}
