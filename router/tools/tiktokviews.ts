import { Request, Response } from "express"
import puppeteer from "puppeteer"

export default async function tiktokViews(req: Request, res: Response) {
  try {
    const { link, jumlah } = req.query

    if (!link || !jumlah) {
      return res.status(400).json({
        status: false,
        message: "Parameter link dan jumlah diperlukan, jangan tolol."
      })
    }

    const targetViews = parseInt(jumlah as string)
    if (isNaN(targetViews) || targetViews > 10) {
      return res.status(400).json({
        status: false,
        message: "Jumlah maksimal cuma 10, jangan serakah."
      })
    }

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
    })

    const page = await browser.newPage()
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
    )

    console.log(`[VOID] Memulai serangan ke: ${link} untuk ${targetViews} views.`);

    for (let i = 1; i <= targetViews; i++) {
      try {
        // Navigasi ke video
        await page.goto(link as string, { waitUntil: "networkidle2", timeout: 60000 })
        
        // Simulasi nonton (diam sejenak agar terhitung sistem)
        await new Promise(r => setTimeout(r, 7000))

        // Burn cookies & storage tiap hit biar fresh
        const client = await page.target().createCDPSession()
        await client.send('Network.clearBrowserCookies')
        await client.send('Network.clearBrowserCache')
        
        console.log(`[VOID] Success injecting view ${i}/${targetViews}`)
      } catch (e) {
        console.error(`[ERROR] View ${i} gagal:`, e)
      }
    }

    await browser.close()

    res.json({
      status: true,
      message: `Berhasil memproses ${targetViews} views ke video target.`,
      result: {
        link,
        total_injected: targetViews
      }
    })

  } catch (err: any) {
    console.error(err)
    res.status(500).json({
      status: false,
      message: "Kernel error: Gagal memproses request view.",
      error: err.message
    })
  }
}
