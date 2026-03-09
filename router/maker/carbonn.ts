import { Request, Response } from "express"
const { chromium } = require("playwright")

async function CarbonifyV1(code: string, title?: string): Promise<Buffer> {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  try {
    await page.goto("https://carbon.now.sh/?bg=rgba%28171%2C+184%2C+195%2C+1%29&t=seti&wt=none&l=auto&width=680&ds=true&dsyoff=20px&dsblur=68px&wc=true&wa=true&pv=56px&ph=56px&ln=false&fl=1&fm=Hack&fs=14px&lh=133%25&si=false&es=2x&wm=false")
    await page.waitForLoadState("networkidle")

    await page.evaluate((code: string) => {
      const editor = (document.querySelector(".CodeMirror") as any).CodeMirror
      editor.setValue(code)
    }, code)

    if (title) {
      await page.locator('input[aria-label="Image title"]').fill(title)
    }

    const screenshot = await page.locator("#export-container").screenshot({ type: "png" })
    await browser.close()
    return Buffer.from(screenshot)
  } catch (error: any) {
    await browser.close()
    throw new Error("Failed to generate image from code")
  }
}

export default async function carbonHandler(req: Request, res: Response) {
  const code = req.query.code as string
  const title = req.query.title as string | undefined

  if (!code || code.trim() === "") {
    return res.status(400).json({ status: false, message: "Parameter 'code' wajib diisi" })
  }

  try {
    const buffer = await CarbonifyV1(code.trim(), title?.trim())

    res.set({
      "Content-Type": "image/png",
      "Content-Length": buffer.length.toString(),
      "Cache-Control": "public, max-age=3600",
    })
    res.send(buffer)
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message })
  }
}
