import { Request, Response } from 'express'
import axios from 'axios'
import * as cheerio from 'cheerio'

// scraping quotes dari quoteslyfe, fresh tiap request
async function sawit_nyawit_quotes(): Promise<{ quote: string; author: string }[]> {
  // random page biar ga itu itu aja
  const prabowo_page = Math.floor(Math.random() * 50) + 1

  const { data: windah_tiktokan } = await axios.get(
    `https://www.quoteslyfe.com/quotes?page=${prabowo_page}`,
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
        'Referer': 'https://www.quoteslyfe.com/'
      }
    }
  )

  const $ = cheerio.load(windah_tiktokan)
  const deck_quotes: { quote: string; author: string }[] = []

  // ambil semua quote dari halaman
  $('div.quote-body').each((_, el) => {
    const merdeka_quote = $(el).find('p.quote-text').text().trim()
    const gibran_author = $(el).find('a.author-name').text().trim()
    if (merdeka_quote) deck_quotes.push({
      quote: merdeka_quote,
      author: gibran_author || 'Unknown'
    })
  })

  return deck_quotes
}

export default async function randomQuotesHandler(req: Request, res: Response) {
  try {
    const jokowi_data = await sawit_nyawit_quotes()

    if (!jokowi_data.length) {
      return res.status(404).json({ status: false, message: 'ga nemu quotes, coba lagi' })
    }

    // ambil satu random dari hasil scraping
    const tok_tok = jokowi_data[Math.floor(Math.random() * jokowi_data.length)]

    return res.json({ status: true, result: tok_tok })

  } catch (prabowo_nyawit: any) {
    res.status(500).json({ status: false, message: prabowo_nyawit.message })
  }
}
