import { Request, Response } from 'express'
import axios from 'axios'

const GEMINI_API_KEY = Buffer.from('QUl6YVN5Qy1DWTUyM1pwa1VLcTBSanlBU0xmZ0ZCR09sVHdTbkp3', 'base64').toString('utf-8')
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`

export default async function handler(req: Request, res: Response) {
  const foto = req.query.foto as string
  const prompt = req.query.prompt as string

  if (!foto) return res.status(400).json({ status: false, message: 'kasih url foto nya bestie 😭 ?foto=' })
  if (!prompt) return res.status(400).json({ status: false, message: 'kasih prompt nya bestie 😭 ?prompt=' })

  try {
    // download foto → base64
    const imgRes = await axios.get(foto, { responseType: 'arraybuffer', timeout: 10000 })
    const mimeType = (imgRes.headers['content-type'] || 'image/jpeg').split(';')[0]
    const base64 = Buffer.from(imgRes.data).toString('base64')

    const { data } = await axios.post(GEMINI_URL, {
      contents: [{
        parts: [
          { text: `Edit gambar ini sesuai instruksi berikut, kembalikan hanya gambar hasil edit tanpa teks tambahan: ${prompt}` },
          { inline_data: { mime_type: mimeType, data: base64 } }
        ]
      }],
      generationConfig: {
        response_modalities: ['IMAGE', 'TEXT'],
        temperature: 1,
      }
    }, { timeout: 30000 })

    // ambil hasil gambar dari response
    const parts = data?.candidates?.[0]?.content?.parts || []
    const imgPart = parts.find((p: any) => p.inline_data?.data)

    if (!imgPart) {
      const textPart = parts.find((p: any) => p.text)
      return res.status(500).json({
        status: false,
        message: textPart?.text || 'Gemini ga bisa edit gambar ini 😭'
      })
    }

    const resultBase64 = imgPart.inline_data.data
    const resultMime = imgPart.inline_data.mime_type || 'image/png'
    const imgBuffer = Buffer.from(resultBase64, 'base64')

    res.setHeader('Content-Type', resultMime)
    res.setHeader('Content-Length', imgBuffer.length)
    return res.end(imgBuffer)

  } catch (e: any) {
    const msg = e?.response?.data?.error?.message || e.message
    return res.status(500).json({ status: false, message: msg })
  }
}
