import { Request, Response } from "express"

export default async function base64totextHandler(req: Request, res: Response) {
  const text = req.query.text as string

  if (!text || text.trim() === "") {
    return res.status(400).json({ status: false, message: "Parameter 'text' wajib diisi" })
  }

  try {
    const result = Buffer.from(text, "base64").toString("utf-8")
    res.json({ status: true, data: { input: text, result } })
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message })
  }
}
