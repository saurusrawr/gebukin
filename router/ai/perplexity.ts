import { Request, Response } from "express"
import axios from "axios"
import * as crypto from "crypto"

const BASE = "https://www.perplexity.ai"

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

function buat_cookie(): string {
  const cookies: Record<string, string> = {
    'pplx.visitor-id': crypto.randomUUID(),
    'pplx.session-id': crypto.randomUUID(),
    'pplx.edge-vid': crypto.randomUUID(),
    'pplx.edge-sid': crypto.randomUUID()
  }
  return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ')
}

function buat_payload(query: string) {
  return {
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
        'search_result_widgets', 'inline_images', 'canvas_mode', 'answer_tabs',
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
}

function parse_sse(raw: string): string | null {
  const lines = raw.split('\n')
  for (let i = lines.length - 1; i >= 0; i--) {
    if (!lines[i].startsWith('data: ')) continue
    try {
      const d = JSON.parse(lines[i].substring(5))
      if (d.text && d.final) {
        const parsed = JSON.parse(d.text)
        for (const item of parsed) {
          if (item.step_type === 'FINAL' && item.content?.answer) {
            return JSON.parse(item.content.answer).answer.replace(/\[\d+\]/g, '').trim()
          }
        }
      }
    } catch {}
  }
  return null
}

// ── METHOD 1: axios biasa ──
async function coba_axios(query: string): Promise<string> {
  const { data } = await axios.post(
    `${BASE}/rest/sse/perplexity_ask`,
    JSON.stringify(buat_payload(query)),
    {
      headers: {
        ...header_dasar,
        'Cookie': buat_cookie(),
        'x-request-id': crypto.randomUUID(),
        'x-perplexity-request-reason': 'perplexity-query-state-provider'
      },
      timeout: 30000,
      responseType: 'text'
    }
  )
  const hasil = parse_sse(data)
  if (!hasil) throw new Error("ga dapet jawaban")
  return hasil
}

// ── METHOD 2: cloudscraper ──
async function coba_cloudscraper(query: string): Promise<string> {
  const cloudscraper = require('cloudscraper')
  const raw = await cloudscraper({
    method: 'POST',
    url: `${BASE}/rest/sse/perplexity_ask`,
    headers: {
      ...header_dasar,
      'Cookie': buat_cookie(),
      'x-request-id': crypto.randomUUID(),
      'x-perplexity-request-reason': 'perplexity-query-state-provider'
    },
    body: JSON.stringify(buat_payload(query))
  })
  const hasil = parse_sse(raw)
  if (!hasil) throw new Error("ga dapet jawaban dari cloudscraper")
  return hasil
}

// ── METHOD 3: playwright ──
async function coba_playwright(query: string): Promise<string> {
  const { chromium } = require('playwright')
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
  const context = await browser.newContext({
    userAgent: header_dasar['User-Agent'],
    locale: 'id-ID',
    extraHTTPHeaders: {
      'Accept-Language': 'id-ID,id;q=0.9'
    }
  })

  try {
    const page = await context.newPage()

    // buka dulu biar dapet cookie yang valid
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)

    // intercept response SSE
    let sse_data = ''
    const hasil_promise = new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout playwright')), 60000)
      page.on('response', async (response) => {
        if (response.url().includes('perplexity_ask')) {
          try {
            const body = await response.text()
            const jawaban = parse_sse(body)
            if (jawaban) {
              clearTimeout(timer)
              resolve(jawaban)
            }
          } catch {}
        }
      })
    })

    // tembak request langsung via page.evaluate
    await page.evaluate(async (payload: any) => {
      await fetch('/rest/sse/perplexity_ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
    }, buat_payload(query))

    return await hasil_promise
  } finally {
    await browser.close()
  }
}

export default async function perplexityHandler(req: Request, res: Response) {
  const q = String(req.query.q || req.query.query || "").trim()

  if (!q) {
    return res.status(400).json({
      status: false,
      message: "parameter 'q' wajib diisi cik"
    })
  }

  // coba axios dulu, kalo 403 fallback ke cloudscraper, kalo masih gagal playwright
  const methods = [
    { name: 'axios', fn: () => coba_axios(q) },
    { name: 'cloudscraper', fn: () => coba_cloudscraper(q) },
    { name: 'playwright', fn: () => coba_playwright(q) },
  ]

  let last_err = ''
  for (const { name, fn } of methods) {
    try {
      const jawaban = await fn()
      return res.json({
        status: true,
        query: q,
        answer: jawaban
      })
    } catch (err: any) {
      last_err = `${name}: ${err.message}`
      // kalo bukan 403/block, stop — berarti error lain
      if (!err.message?.includes('403') && !err.message?.includes('block') && !err.message?.includes('challenge')) break
    }
  }

  res.status(500).json({ status: false, message: last_err })
}
