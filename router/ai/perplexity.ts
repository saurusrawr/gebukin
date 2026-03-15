import { Request, Response } from "express"
import axios from "axios"
import * as crypto from "crypto"

const BASE = "https://www.perplexity.ai"

// header buat semua request ke perplexity
const header_dasar = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
  'Accept': 'text/event-stream',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'Content-Type': 'application/json',
  'Origin': BASE,
  'Referer': BASE + '/',
  'sec-ch-ua': '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Linux"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin'
}

// bikin cookie string dari object
function buat_cookie(): string {
  const cookies: Record<string, string> = {
    'pplx.visitor-id': crypto.randomUUID(),
    'pplx.session-id': crypto.randomUUID(),
    'pplx.edge-vid': crypto.randomUUID(),
    'pplx.edge-sid': crypto.randomUUID()
  }
  return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ')
}

async function tanya_perplexity(query: string): Promise<string> {
  const payload = {
    params: {
      last_backend_uuid: crypto.randomUUID(),
      read_write_token: crypto.randomUUID(),
      attachments: [],
      language: 'id-ID',
      timezone: 'Asia/Jakarta',
      search_focus: 'internet',
      sources: ['web'],
      frontend_uuid: crypto.randomUUID(),
      mode: 'copilot',
      model_preference: 'turbo',
      is_related_query: false,
      is_sponsored: false,
      prompt_source: 'user',
      query_source: 'followup',
      is_incognito: false,
      local_search_enabled: false,
      use_schematized_api: true,
      send_back_text_in_streaming_api: false,
      supported_block_use_cases: [
        'answer_modes', 'media_items', 'knowledge_cards', 'inline_entity_cards',
        'place_widgets', 'finance_widgets', 'search_result_widgets',
        'inline_images', 'inline_assets', 'canvas_mode', 'answer_tabs',
        'preserve_latex', 'in_context_suggestions', 'inline_claims'
      ],
      client_coordinates: null,
      mentions: [],
      skip_search_enabled: true,
      followup_source: 'link',
      source: 'default',
      always_search_override: false,
      override_no_search: false,
      force_enable_browser_agent: false,
      version: '2.18'
    },
    query_str: query
  }

  const { data: raw } = await axios.post(
    `${BASE}/rest/sse/perplexity_ask`,
    JSON.stringify(payload),
    {
      headers: {
        ...header_dasar,
        'Cookie': buat_cookie(),
        'x-request-id': crypto.randomUUID(),
        'x-perplexity-request-reason': 'perplexity-query-state-provider'
      },
      timeout: 30000,
      // response SSE, jangan di-parse otomatis
      responseType: 'text'
    }
  )

  // parse SSE lines dari belakang, cari yang final
  const lines: string[] = raw.split('\n')
  for (let i = lines.length - 1; i >= 0; i--) {
    if (!lines[i].startsWith('data: ')) continue
    try {
      const d = JSON.parse(lines[i].substring(5))
      if (d.text && d.final) {
        const parsed = JSON.parse(d.text)
        for (const item of parsed) {
          if (item.step_type === 'FINAL' && item.content?.answer) {
            const jawaban = JSON.parse(item.content.answer)
            return jawaban.answer
          }
        }
      }
    } catch {}
  }

  throw new Error("ga dapet jawaban dari perplexity, zonk")
}

export default async function perplexityHandler(req: Request, res: Response) {
  const q = String(req.query.q || req.query.query || "").trim()

  if (!q) {
    return res.status(400).json({
      status: false,
      message: "parameter 'q' wajib diisi cik"
    })
  }

  try {
    const jawaban = await tanya_perplexity(q)
    res.json({
      status: true,
      query: q,
      answer: jawaban
    })
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message })
  }
}
