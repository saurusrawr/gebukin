import { Request, Response } from "express"
import axios from "axios"
import * as cheerio from "cheerio"

interface Grup {
  title: string
  description: string
  link: string
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

// Ekstrak semua link chat.whatsapp.com dari HTML
function extractWaLinks($: cheerio.CheerioAPI, baseTitle = ''): Grup[] {
  const results: Grup[] = []
  $('a').each((_, el) => {
    const href = $(el).attr('href') || ''
    if (!href.includes('chat.whatsapp.com')) return
    const title = $(el).closest('article,.post,.card,.group,.item,.entry')
      .find('h1,h2,h3,h4,.title,.name').first().text().trim()
      || $(el).attr('title') || $(el).text().trim() || baseTitle || 'Grup WhatsApp'
    const desc = $(el).closest('article,.post,.card,.group,.item,.entry')
      .find('p,.desc,.description,.snippet').first().text().trim().slice(0, 200)
    results.push({ title, description: desc || '-', link: href })
  })
  return results
}

// ── SOURCE 1: Google via scrape (user-agent desktop) ──
async function fromGoogle(q: string): Promise<Grup[]> {
  try {
    const query = `"chat.whatsapp.com/invite" ${q}`
    const { data } = await axios.get(`https://www.google.com/search?q=${encodeURIComponent(query)}&num=20&hl=id`, {
      headers: {
        'User-Agent': UA,
        'Accept': 'text/html',
        'Accept-Language': 'id-ID,id;q=0.9',
        'Referer': 'https://www.google.com/'
      },
      timeout: 10000
    })
    const $ = cheerio.load(data)
    const results: Grup[] = []

    // Cari semua link WA di hasil Google
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || ''
      const waMatch = href.match(/chat\.whatsapp\.com\/[A-Za-z0-9]{10,}/)
      if (waMatch) {
        const link = `https://${waMatch[0]}`
        const title = $(el).text().trim() || $(el).closest('div').find('h3').text().trim() || 'Grup WhatsApp'
        const desc = $(el).closest('div[data-sokoban-container], .g').find('div[style*="webkit-line-clamp"], span').first().text().trim().slice(0, 200)
        results.push({ title, description: desc || '-', link })
      }
    })

    // Cari di teks biasa
    const bodyText = $.html()
    const regex = /chat\.whatsapp\.com\/[A-Za-z0-9]{10,}/g
    const matches = bodyText.match(regex) || []
    for (const m of matches) {
      results.push({ title: 'Grup WhatsApp', description: '-', link: `https://${m}` })
    }

    return results
  } catch { return [] }
}

// ── SOURCE 2: Yandex search ──
async function fromYandex(q: string): Promise<Grup[]> {
  try {
    const query = `chat.whatsapp.com/invite ${q}`
    const { data } = await axios.get(`https://yandex.com/search/?text=${encodeURIComponent(query)}&lang=id`, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'id' },
      timeout: 10000
    })
    const $ = cheerio.load(data)
    const results: Grup[] = []
    const bodyText = $.html()
    const regex = /chat\.whatsapp\.com\/[A-Za-z0-9]{10,}/g
    const matches = [...new Set(bodyText.match(regex) || [])]
    for (const m of matches) {
      results.push({ title: 'Grup WhatsApp', description: '-', link: `https://${m}` })
    }
    return results
  } catch { return [] }
}

// ── SOURCE 3: scrape beberapa site listing grup ──
async function fromSites(q: string): Promise<Grup[]> {
  const sites = [
    `https://grupwa.id/?s=${encodeURIComponent(q)}`,
    `https://linkgrupwa.com/?s=${encodeURIComponent(q)}`,
    `https://whatsapp-group.com/?s=${encodeURIComponent(q)}`,
    `https://groupsor.com/search?q=${encodeURIComponent(q)}`,
    `https://whatsapgrouplink.net/?s=${encodeURIComponent(q)}`,
  ]

  const results: Grup[] = []
  await Promise.allSettled(sites.map(async (url) => {
    try {
      const { data } = await axios.get(url, {
        headers: { 'User-Agent': UA },
        timeout: 8000
      })
      const $ = cheerio.load(data)
      // Regex extract semua link WA dari seluruh HTML
      const html = $.html()
      const regex = /chat\.whatsapp\.com\/[A-Za-z0-9]{10,}/g
      const matches = [...new Set(html.match(regex) || [])]
      for (const m of matches) {
        const link = `https://${m}`
        // Cari title terdekat
        results.push({ title: 'Grup WhatsApp', description: `Dari: ${new URL(url).hostname}`, link })
      }
    } catch {}
  }))

  return results
}

// ── SOURCE 4: SearXNG public instances ──
async function fromSearx(q: string): Promise<Grup[]> {
  const instances = [
    'https://searx.be',
    'https://search.disroot.org',
    'https://searx.tiekoetter.com',
  ]
  const results: Grup[] = []
  for (const base of instances) {
    try {
      const query = `"chat.whatsapp.com" ${q}`
      const { data } = await axios.get(`${base}/search`, {
        params: { q: query, format: 'json', language: 'id' },
        headers: { 'User-Agent': UA },
        timeout: 8000
      })
      for (const r of (data.results || [])) {
        const url: string = r.url || ''
        const waMatch = url.match(/chat\.whatsapp\.com\/[A-Za-z0-9]{10,}/)
        if (waMatch) {
          results.push({
            title: r.title || 'Grup WhatsApp',
            description: r.content || '-',
            link: `https://${waMatch[0]}`
          })
        }
        // Juga cek di content
        const content: string = r.content || ''
        const contentMatch = content.match(/chat\.whatsapp\.com\/[A-Za-z0-9]{10,}/)
        if (contentMatch && !waMatch) {
          results.push({
            title: r.title || 'Grup WhatsApp',
            description: content.slice(0, 200),
            link: `https://${contentMatch[0]}`
          })
        }
      }
      if (results.length > 0) break // kalau sudah dapat hasil, stop
    } catch {}
  }
  return results
}

export default async function carigrpwaHandler(req: Request, res: Response) {
  const q = String(req.query.q || req.query.query || '').trim()

  if (!q) {
    return res.status(400).json({
      status: false,
      message: "Parameter 'q' wajib diisi. Contoh: q=gaming"
    })
  }

  const [r1, r2, r3, r4] = await Promise.allSettled([
    fromGoogle(q),
    fromYandex(q),
    fromSites(q),
    fromSearx(q),
  ])

  const all: Grup[] = [
    ...(r1.status === 'fulfilled' ? r1.value : []),
    ...(r2.status === 'fulfilled' ? r2.value : []),
    ...(r3.status === 'fulfilled' ? r3.value : []),
    ...(r4.status === 'fulfilled' ? r4.value : []),
  ]

  // Deduplicate by link
  const seen = new Set<string>()
  const groups = all.filter(g => {
    const key = g.link.replace(/[?#].*$/, '').trim()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })

  res.json({
    status: true,
    query: q,
    total: groups.length,
    groups
  })
}
