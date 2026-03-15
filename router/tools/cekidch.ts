import { Request, Response } from "express"
import { chromium } from "playwright"

async function scrape_channel(url: string) {
  const channel_url = url.startsWith('http') ? url : `https://whatsapp.com/channel/${url}`

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  })

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
    locale: 'id-ID'
  })

  try {
    const page = await context.newPage()
    let newsletter_id: string | null = null

    // intercept response, cari newsletter id dari network
    page.on('response', async (response) => {
      try {
        const text = await response.text().catch(() => '')
        const match = text.match(/(\d{15,}@newsletter)/)
          || text.match(/"jid"\s*:\s*"(\d+@newsletter)"/)
        if (match && !newsletter_id) newsletter_id = match[1]
      } catch {}
    })

    await page.goto(channel_url, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(3000)

    const html = await page.content()

    // cari dari html yg udah render kalo intercept ga dapet
    if (!newsletter_id) {
      const match = html.match(/(\d{15,}@newsletter)/)
        || html.match(/"jid"\s*:\s*"(\d+@newsletter)"/)
        || html.match(/newsletterId["\s:]+["']?(\d+)/i)
      newsletter_id = match?.[1]
        ? (match[1].includes('@newsletter') ? match[1] : `${match[1]}@newsletter`)
        : null
    }

    const nama = await page.$eval('meta[property="og:title"]', el => el.getAttribute('content')).catch(() => '-')
    const deskripsi = await page.$eval('meta[property="og:description"]', el => el.getAttribute('content')).catch(() => '-')
    const foto = await page.$eval('meta[property="og:image"]', el => el.getAttribute('content')).catch(() => null)
    const url_canonical = await page.$eval('link[rel="canonical"]', el => el.getAttribute('href')).catch(() => channel_url)

    const channel_id = url_canonical.match(/channel\/([A-Za-z0-9]+)/)?.[1] || '-'
    const subscribers = deskripsi?.match(/([\d,.]+\s*(ribu|juta|rb|k|M)?\s*(pengikut|followers))/i)?.[0]?.trim() || '-'

    return { nama, channel_id, newsletter_id, deskripsi, foto, subscribers, url: url_canonical }
  } finally {
    await browser.close()
  }
}

export default async function cekidchHandler(req: Request, res: Response) {
  const input = String(req.query.url || req.query.id || "").trim()

  if (!input) {
    return res.status(400).json({
      status: false,
      message: "parameter 'url' wajib diisi, contoh: ?url=https://whatsapp.com/channel/xxx"
    })
  }

  try {
    const hasil = await scrape_channel(input)
    res.json({ status: true, ...hasil })
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message })
  }
        }
