import { Request, Response } from "express"
import axios from "axios"

async function getTtsAudio(text: string, voice: string, rate: string, pitch: string, volume: string): Promise<Buffer> {
  const apiUrl = `https://iniapi-tts.hf.space/generate?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voice)}&rate=${encodeURIComponent(rate)}&volume=${encodeURIComponent(volume)}&pitch=${encodeURIComponent(pitch)}`

  const response = await axios.get(apiUrl, {
    headers: {
      "accept": "*/*",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "sec-ch-ua": '"Not-A.Brand";v="99", "Chromium";v="124"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    },
    responseType: "arraybuffer",
    timeout: 30000,
  })

  return Buffer.from(response.data)
}

export default async function ttsHandler(req: Request, res: Response) {
  const text   = req.query.text   as string
  const voice  = (req.query.voice  as string) || "id-ID-ArdiNeural"
  const rate   = (req.query.rate   as string) || "+0%"
  const pitch  = (req.query.pitch  as string) || "+0Hz"
  const volume = (req.query.volume as string) || "+0%"

  if (!text || text.trim() === "") {
    return res.status(400).json({ status: false, message: "Parameter 'text' wajib diisi" })
  }

  try {
    const buffer = await getTtsAudio(text.trim(), voice, rate, pitch, volume)

    res.set({
      "Content-Type": "audio/wav",
      "Content-Length": buffer.length.toString(),
      "Cache-Control": "public, max-age=3600",
      "Content-Disposition": `inline; filename="tts.wav"`,
    })

    res.send(buffer)
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message })
  }
}
