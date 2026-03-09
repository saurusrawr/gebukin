import { Request, Response } from "express"
import axios from "axios"

async function getIslamicAnswer(query: string) {
  try {
    const responseSearch = await axios.post(
      "https://www.muslimai.io/api/search",
      { query },
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
          "Referer": "https://www.muslimai.io/",
        },
        timeout: 30000,
      },
    )

    const ayatData = responseSearch.data
    const content = ayatData?.[0]?.content

    if (!content) {
      throw new Error("No data found for the query")
    }

    const prompt = `Use the following passages to answer the query in Indonesian, ensuring clarity and understanding, as a world-class expert in the Quran. Do not mention that you were provided any passages in your answer: ${query}\n\n${content}`

    const responseAnswer = await axios.post(
      "https://www.muslimai.io/api/answer",
      { prompt },
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
          "Referer": "https://www.muslimai.io/",
        },
        timeout: 30000,
      },
    )

    const jawaban = responseAnswer.data

    if (!jawaban) {
      throw new Error("Error retrieving the answer")
    }

    return jawaban
  } catch (error: any) {
    console.error("Scraping error:", error.message)
    throw error
  }
}

export default async function muslimAIHandler(req: Request, res: Response) {
  const query = (req.query.q as string) || (req.body.q as string)

  if (!query) {
    return res.status(400).json({ status: false, message: "Parameter 'q' is required" })
  }

  try {
    const result = await getIslamicAnswer(query)
    res.json({ status: true, data: result })
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message })
  }
}
