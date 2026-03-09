import { Request, Response } from "express"
import { chromium } from "playwright"

async function convertHtmlToImage(htmlCode: string): Promise<Buffer> {
  let browser
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    })

    const context = await browser.newContext()
    const page = await context.newPage()

    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.setContent(htmlCode, { waitUntil: "domcontentloaded", timeout: 30000 })
    await page.waitForTimeout(1000)

    const screenshotBuffer = await page.screenshot({
      fullPage: true,
      type: "png",
    })

    return screenshotBuffer as Buffer
  } finally {
    if (browser) await browser.close()
  }
}

export default async function html2imgHandler(req: Request, res: Response) {
  const html = (req.query.html as string) || (req.body?.html as string)

  if (!html || html.trim() === "") {
    return res.status(400).json({ status: false, message: "Parameter 'html' wajib diisi (query atau body)" })
  }

  try {
    const buffer = await convertHtmlToImage(html)

    res.set({
      "Content-Type": "image/png",
      "Content-Length": buffer.length.toString(),
      "Cache-Control": "public, max-age=3600",
      "Content-Disposition": `inline; filename="html2img.png"`,
    })

    res.send(buffer)
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message })
  }
}
