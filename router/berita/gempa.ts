import { Request, Response } from "express"
import axios from "axios"

const urls = {
  auto: "https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json",
  terkini: "https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json",
  dirasakan: "https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.json",
}

const BASE_SHAKEMAP_URL = "https://data.bmkg.go.id/DataMKG/TEWS/"

async function fetchAndCleanJSON(url: string) {
  const response = await axios.get(url, {
    timeout: 30000,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    },
  })

  const cleanText = JSON.stringify(response.data).replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
  return JSON.parse(cleanText)
}

function addShakemapToGempa(gempa: any): any {
  if (!gempa || !gempa.Shakemap) return gempa
  return { ...gempa, downloadShakemap: `${BASE_SHAKEMAP_URL}${gempa.Shakemap}` }
}

function addShakemapUrls(data: any): any {
  if (!data?.Infogempa) return data

  if (data.Infogempa.gempa && !Array.isArray(data.Infogempa.gempa)) {
    return {
      ...data,
      Infogempa: { ...data.Infogempa, gempa: addShakemapToGempa(data.Infogempa.gempa) },
    }
  }

  if (Array.isArray(data.Infogempa.gempa)) {
    return {
      ...data,
      Infogempa: { ...data.Infogempa, gempa: data.Infogempa.gempa.map(addShakemapToGempa) },
    }
  }

  return data
}

async function scrapeBMKG() {
  const responses = await Promise.all(Object.values(urls).map((url) => fetchAndCleanJSON(url)))
  const processed = responses.map(addShakemapUrls)
  return { auto: processed[0], terkini: processed[1], dirasakan: processed[2] }
}

export default async function gempaHandler(req: Request, res: Response) {
  try {
    const data = await scrapeBMKG()
    res.json({ status: true, data })
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message })
  }
}
