import { Request, Response } from "express"
import axios from "axios"
import FormData from "form-data"

export default async function animefinderHandler(req: Request, res: Response) {
  const url = req.query.url as string

  if (!url || url.trim() === "") {
    return res.status(400).json({ status: false, message: "Parameter 'url' wajib diisi" })
  }

  try {
    // Download gambar dari URL
    const imageRes = await axios.get(url.trim(), {
      responseType: "arraybuffer",
      timeout: 15000,
      headers: { "User-Agent": "Mozilla/5.0" },
    })

    const imageBuffer = Buffer.from(imageRes.data)

    // Kirim ke animefinder API
    const form = new FormData()
    form.append("image", imageBuffer, {
      filename: "anime.jpg",
      contentType: "image/jpeg",
    })

    const response = await axios.post(
      "https://www.animefinder.xyz/api/identify",
      form,
      {
        headers: {
          ...form.getHeaders(),
          "Origin": "https://www.animefinder.xyz",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
        maxBodyLength: Infinity,
        timeout: 30000,
      }
    )

    const result = response.data

    res.json({
      status: true,
      data: {
        anime: result.animeTitle,
        character: result.character,
        genres: result.genres,
        premiere: result.premiereDate,
        production: result.productionHouse,
        description: result.description,
        synopsis: result.synopsis,
        references: result.references || [],
      },
    })
  } catch (error: any) {
    res.status(500).json({
      status: false,
      message: error.response?.data?.error || error.message,
    })
  }
}
