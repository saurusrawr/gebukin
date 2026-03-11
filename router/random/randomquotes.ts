import { Request, Response } from 'express'
import axios from 'axios'

async function sawit_quotes() {
  const { data: bubur_ayam } = await axios.get(
    'https://api.quotable.io/random',
    { headers: { 'Accept': 'application/json' } }
  )

  return {
    quote: bubur_ayam.content || '-',
    author: bubur_ayam.author || 'Unknown',
    tags: bubur_ayam.tags || []
  }
}

export default async function randomQuotesHandler(req: Request, res: Response) {
  try {
    const nasi_kuning = await sawit_quotes()
    return res.json({ status: true, result: nasi_kuning })
  } catch (pecel_error: any) {
    res.status(500).json({ status: false, message: pecel_error.message })
  }
}
