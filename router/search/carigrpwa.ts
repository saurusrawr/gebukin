import { Request, Response } from "express"
import axios from "axios"
import * as cheerio from "cheerio"

interface Grup {
  title: string
  description: string
  link: string
  members?: string
  category?: string
}

const UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36'

// ── SOURCE 1: whatsapp-group.com ──
async function fromWhatsappGroupCom(q: string): Promise<Grup[]> {
  try {
    const { data } = await axios.get(`https://whatsapp-group.com/?s=${encodeURIComponent(q)}`, {
      headers: { 'User-Agent': UA }, timeout: 8000
    })
    const $ = cheerio.load(data)
    const results: Grup[] = []
    $('article, .post, .entry, .group-item').each((_, el) => {
      const title = $(el).find('h2, h3, .entry-title').first().text().trim()
      const desc = $(el).find('p, .entry-content').first().text().trim().slice(0, 150)
      const link = $(el).find('a[href*="chat.whatsapp.com"]').attr('href') || ''
      if (link) results.push({ title: title || 'Grup WA', description: desc || '-', link })
    })
    return results
  } catch { return [] }
}

// ── SOURCE 2: grupwa.id ──
async function fromGrupwaId(q: string): Promise<Grup[]> {
  try {
    const { data } = await axios.get(`https://grupwa.id/?s=${encodeURIComponent(q)}`, {
      headers: { 'User-Agent': UA }, timeout: 8000
    })
    const $ = cheerio.load(data)
    const results: Grup[] = []
    $('article, .post').each((_, el) => {
      const title = $(el).find('h2, h3, .entry-title').first().text().trim()
      const desc = $(el).find('p').first().text().trim().slice(0, 150)
      const link = $(el).find('a[href*="chat.whatsapp.com"]').attr('href') || ''
      if (link) results.push({ title: title || 'Grup WA', description: desc || '-', link })
    })
    return results
  } catch { return [] }
}

// ── SOURCE 3: linkgrupwa.com ──
async function fromLinkGrupwa(q: string): Promise<Grup[]> {
  try {
    const { data } = await axios.get(`https://linkgrupwa.com/?s=${encodeURIComponent(q)}`, {
      headers: { 'User-Agent': UA }, timeout: 8000
    })
    const $ = cheerio.load(data)
    const results: Grup[] = []
    $('article, .post').each((_, el) => {
      const title = $(el).find('h2, h3').first().text().trim()
      const desc = $(el).find('p').first().text().trim().slice(0, 150)
      const link = $(el).find('a[href*="chat.whatsapp.com"]').attr('href') || ''
      if (link) results.push({ title: title || 'Grup WA', description: desc || '-', link })
    })
    return results
  } catch { return [] }
}

// ── SOURCE 4: groupsor.com ──
async function fromGroupsor(q: string): Promise<Grup[]> {
  try {
    const { data } = await axios.get(`https://groupsor.com/search?q=${encodeURIComponent(q)}`, {
      headers: { 'User-Agent': UA, 'Accept': 'text/html' }, timeout: 8000
    })
    const $ = cheerio.load(data)
    const results: Grup[] = []
    $('.group-card, .card, .item, article').each((_, el) => {
      const title = $(el).find('h2, h3, h4, .title, .name').first().text().trim()
      const desc = $(el).find('p, .desc, .description').first().text().trim().slice(0, 150)
      const link = $(el).find('a[href*="chat.whatsapp.com"]').attr('href')
        || $(el).find('a[href*="wa.me"]').attr('href') || ''
      const members = $(el).find('[class*="member"], [class*="count"]').first().text().trim()
      if (link) results.push({ title: title || 'Grup WA', description: desc || '-', link, members: members || '-' })
    })
    return results
  } catch { return [] }
}

// ── SOURCE 5: whatsapgrouplink.net ──
async function fromWhatsapGroupLink(q: string): Promise<Grup[]> {
  try {
    const { data } = await axios.get(`https://whatsapgrouplink.net/?s=${encodeURIComponent(q)}`, {
      headers: { 'User-Agent': UA }, timeout: 8000
    })
    const $ = cheerio.load(data)
    const results: Grup[] = []
    $('article, .post, .group').each((_, el) => {
      const title = $(el).find('h2, h3').first().text().trim()
      const desc = $(el).find('p').first().text().trim().slice(0, 150)
      const link = $(el).find('a[href*="chat.whatsapp.com"]').attr('href') || ''
      if (link) results.push({ title: title || 'Grup WA', description: desc || '-', link })
    })
    return results
  } catch { return [] }
}

// ── SOURCE 6: walink.ga ──
async function fromWalink(q: string): Promise<Grup[]> {
  try {
    const { data } = await axios.get(`https://walink.ga/search/${encodeURIComponent(q)}`, {
      headers: { 'User-Agent': UA }, timeout: 8000
    })
    const $ = cheerio.load(data)
    const results: Grup[] = []
    $('.card, .group-item, article').each((_, el) => {
      const title = $(el).find('h2, h3, h4, .card-title').first().text().trim()
      const desc = $(el).find('p, .card-text').first().text().trim().slice(0, 150)
      const link = $(el).find('a[href*="chat.whatsapp.com"]').attr('href') || ''
      if (link) results.push({ title: title || 'Grup WA', description: desc || '-', link })
    })
    return results
  } catch { return [] }
}

// ── SOURCE 7: groupwa.id ──
async function fromGroupwaId(q: string): Promise<Grup[]> {
  try {
    const { data } = await axios.get(`https://groupwa.id/search?keyword=${encodeURIComponent(q)}`, {
      headers: { 'User-Agent': UA }, timeout: 8000
    })
    const $ = cheerio.load(data)
    const results: Grup[] = []
    $('.group, .card, article, .item').each((_, el) => {
      const title = $(el).find('h2, h3, h4, .name').first().text().trim()
      const desc = $(el).find('p, .desc').first().text().trim().slice(0, 150)
      const link = $(el).find('a[href*="chat.whatsapp.com"]').attr('href') || ''
      const members = $(el).find('[class*="member"]').first().text().trim()
      if (link) results.push({ title: title || 'Grup WA', description: desc || '-', link, members: members || '-' })
    })
    return results
  } catch { return [] }
}

// ── SOURCE 8: whatsappgrouplinks.net ──
async function fromWaGroupLinks(q: string): Promise<Grup[]> {
  try {
    const { data } = await axios.get(`https://whatsappgrouplinks.net/?s=${encodeURIComponent(q)}`, {
      headers: { 'User-Agent': UA }, timeout: 8000
    })
    const $ = cheerio.load(data)
    const results: Grup[] = []
    $('article, .post').each((_, el) => {
      const title = $(el).find('h2, h3').first().text().trim()
      const desc = $(el).find('p').first().text().trim().slice(0, 150)
      const link = $(el).find('a[href*="chat.whatsapp.com"]').attr('href') || ''
      if (link) results.push({ title: title || 'Grup WA', description: desc || '-', link })
    })
    return results
  } catch { return [] }
}

export default async function carigrpwaHandler(req: Request, res: Response) {
  const q = String(req.query.q || req.query.query || '').trim()

  if (!q) {
    return res.status(400).json({
      status: false,
      message: "Parameter 'q' wajib diisi. Contoh: q=gaming"
    })
  }

  // Jalankan semua sumber paralel
  const [r1, r2, r3, r4, r5, r6, r7, r8] = await Promise.allSettled([
    fromWhatsappGroupCom(q),
    fromGrupwaId(q),
    fromLinkGrupwa(q),
    fromGroupsor(q),
    fromWhatsapGroupLink(q),
    fromWalink(q),
    fromGroupwaId(q),
    fromWaGroupLinks(q),
  ])

  const all: Grup[] = [
    ...(r1.status === 'fulfilled' ? r1.value : []),
    ...(r2.status === 'fulfilled' ? r2.value : []),
    ...(r3.status === 'fulfilled' ? r3.value : []),
    ...(r4.status === 'fulfilled' ? r4.value : []),
    ...(r5.status === 'fulfilled' ? r5.value : []),
    ...(r6.status === 'fulfilled' ? r6.value : []),
    ...(r7.status === 'fulfilled' ? r7.value : []),
    ...(r8.status === 'fulfilled' ? r8.value : []),
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
