import { Request, Response } from "express"
import axios from "axios"

// style yg tersedia di genmyart, kalo salah kasih tau user
const style_valid: Record<string, string> = {
  photorealistic: "Photorealistic",
  "digital-art": "Digital Art",
  impressionist: "Impressionist",
  anime: "Anime",
  fantasy: "Fantasy",
  "sci-fi": "Sci-Fi",
  vintage: "Vintage",
  watercolor: "Watercolor",
  ghibli: "Ghibli",
  cyberpunk: "Cyberpunk",
  surrealist: "Surrealist",
  minimalist: "Minimalist",
  baroque: "Baroque"
}

const resolusi_valid: Record<string, string> = {
  "512x512": "512x512 (SD)",
  "768x768": "768x768",
  "1024x1024": "1024x1024 (HD)",
  "1280x720": "1280x720 (HD 720p)",
  "1920x1080": "1920x1080 (Full HD)"
}

const ratio_valid: Record<string, string> = {
  square: "Square (1:1)",
  portrait: "Portrait (9:16)",
  landscape: "Landscape (16:9)"
}

// ambil nonce dari halaman utama dulu, wajib buat request
async function ambil_nonce(): Promise<string> {
  const { data: html } = await axios.get("https://genmyart.com/", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36",
      "Accept": "text/html"
    },
    timeout: 15000
  })

  const cocok = html.match(/_ajax_nonce:\s*'([a-f0-9]+)'/)
  if (!cocok?.[1]) throw new Error("nonce ga ketemu, genmyart mungkin lagi maintenance")
  return cocok[1]
}

async function bikin_gambar(
  prompt: string,
  style: string,
  resolution: string,
  aspectRatio: string
): Promise<string[]> {
  // ambil nonce dulu, skibidi
  const nonce = await ambil_nonce()

  const params = new URLSearchParams({
    action: "generate_ai_image",
    ai_prompt: prompt,
    ai_style: style,
    ai_resolution: resolution,
    ai_aspect_ratio: aspectRatio,
    ai_num_images: "1",
    _ajax_nonce: nonce
  })

  const { data } = await axios.post(
    "https://genmyart.com/wp-admin/admin-ajax.php",
    params.toString(),
    {
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "referer": "https://genmyart.com/",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36"
      },
      timeout: 60000
    }
  )

  if (!data?.success || !data?.images?.length) {
    throw new Error(data?.data?.message || "generate gagal, zonk")
  }

  return data.images
}

export default async function genmyartHandler(req: Request, res: Response) {
  const prompt = String(req.query.prompt || req.query.q || "").trim()
  const style = String(req.query.style || "anime").toLowerCase()
  const resolution = String(req.query.resolution || "512x512")
  const ratio = String(req.query.ratio || "square").toLowerCase()

  if (!prompt) {
    return res.status(400).json({
      status: false,
      message: "parameter 'prompt' wajib diisi",
      style_tersedia: Object.keys(style_valid),
      resolusi_tersedia: Object.keys(resolusi_valid),
      ratio_tersedia: Object.keys(ratio_valid)
    })
  }

  // validasi style
  if (!style_valid[style]) {
    return res.status(400).json({
      status: false,
      message: `style '${style}' ga valid`,
      style_tersedia: Object.keys(style_valid)
    })
  }

  // validasi resolusi
  if (!resolusi_valid[resolution]) {
    return res.status(400).json({
      status: false,
      message: `resolusi '${resolution}' ga valid`,
      resolusi_tersedia: Object.keys(resolusi_valid)
    })
  }

  // validasi ratio
  if (!ratio_valid[ratio]) {
    return res.status(400).json({
      status: false,
      message: `ratio '${ratio}' ga valid`,
      ratio_tersedia: Object.keys(ratio_valid)
    })
  }

  try {
    const gambar = await bikin_gambar(prompt, style, resolution, ratio)

    res.json({
      status: true,
      prompt,
      style: style_valid[style],
      resolution,
      ratio: ratio_valid[ratio],
      images: gambar
    })
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message })
  }
}
