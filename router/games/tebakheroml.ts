import { Request, Response } from "express"
import axios from "axios"
import * as cheerio from "cheerio"

const characters: string[] = [
  "Aamon",
  "Akai",
  "Aldous",
  "Alice",
  "Alpha",
  "Alucard",
  "Angela",
  "Argus",
  "Arlott",
  "Atlas",
  "Aulus",
  "Aurora",
  "Badang",
  "Balmond",
  "Bane",
  "Barats",
  "Baxia",
  "Beatrix",
  "Belerick",
  "Benedetta",
  "Brody",
  "Bruno",
  "Carmilla",
  "Cecilion",
  "Chou",
  "Cici",
  "Claude",
  "Clint",
  "Cyclops",
  "Diggie",
  "Dyrroth",
  "Edith",
  "Esmeralda",
  "Estes",
  "Eudora",
  "Fanny",
  "Faramis",
  "Floryn",
  "Franco",
  "Fredrinn",
  "Freya",
  "Gatotkaca",
  "Gloo",
  "Gord",
  "Granger",
  "Grock",
  "Guinevere",
  "Gusion",
  "Hanabi",
  "Hanzo",
  "Harith",
  "Harley",
  "Hayabusa",
  "Helcurt",
  "Hilda",
  "Hylos",
  "Irithel",
  "Ixia",
  "Jawhead",
  "Johnson",
  "Joy",
  "Julian",
  "Kadita",
  "Kagura",
  "Kaja",
  "Karina",
  "Karrie",
  "Khaleed",
  "Khufra",
  "Kimmy",
  "Lancelot",
  "Layla",
  "Leomord",
  "Lesley",
  "Ling",
  "Lolita",
  "Lunox",
  "Luo Yi",
  "Lylia",
  "Martis",
  "Masha",
  "Mathilda",
  "Melissa",
  "Minotaur",
  "Minsitthar",
  "Miya",
  "Moskov",
  "Nana",
  "Natalia",
  "Natan",
  "Novaria",
  "Odette",
  "Paquito",
  "Pharsa",
  "Phoveus",
  "Popol and Kupa",
  "Rafaela",
  "Roger",
  "Ruby",
  "Saber",
  "Selena",
  "Silvanna",
  "Sun",
  "Terizla",
  "Thamuz",
  "Tigreal",
  "Uranus",
  "Vale",
  "Valentina",
  "Valir",
  "Vexana",
  "Wanwan",
  "Xavier",
  "Yin",
  "Yu Zhong",
  "Yve",
  "Zhask",
  "Zilong",
]

async function getRandomHeroAudio() {
  try {
    const query = characters[Math.floor(Math.random() * characters.length)]
    const url = `https://mobile-legends.fandom.com/wiki/${query}/Audio/id`
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    })

    const $ = cheerio.load(response.data)
    const audioSrc = $("audio")
      .map((_, el) => $(el).attr("src"))
      .get() as string[]

    const randomAudio = audioSrc[Math.floor(Math.random() * audioSrc.length)]

    if (!randomAudio) {
      throw new Error(`No audio found for character: ${query}`)
    }

    return { name: query, audio: randomAudio }
  } catch (error: any) {
    console.error("API Error:", error.message)
    throw new Error("Failed to fetch hero audio data")
  }
}

export default async function mlbbAudioHandler(req: Request, res: Response) {
  try {
    const result = await getRandomHeroAudio()
    res.json({ status: true, data: result })
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message })
  }
}
