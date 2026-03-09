import { Request, Response } from "express"
import axios from "axios"

export default async function fakeDanaHandler(req: Request, res: Response) {
  try {
    const { angka } = req.query

    if (!angka) {
      return res.status(400).json({
        status: false,
        message: "Parameter angka wajib diisi"
      })
    }

    const response = await axios.post(
      "https://fakedanageneratorditzx-production.up.railway.app/api/generate",
      { angka },
      {
        responseType: "arraybuffer",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0"
        }
      }
    )

    const buffer = Buffer.from(response.data)

    res.setHeader("Content-Type", "image/png")
    res.send(buffer)

  } catch (err: any) {
    console.error(err)
    res.status(500).json({
      status: false,
      message: "Gagal generate fake dana"
    })
  }
}
