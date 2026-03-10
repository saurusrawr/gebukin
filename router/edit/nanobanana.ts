import { Request, Response } from "express"
import axios from "axios"
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { fileTypeFromBuffer } = require("file-type")
import crypto from "crypto"

class GridPlus {
  private ins: any

  constructor() {
    this.ins = axios.create({
      baseURL: 'https://api.grid.plus/v1',
      headers: {
        'user-agent': 'Mozilla/5.0 (Android 15; Mobile; SM-F958; rv:130.0) Gecko/130.0 Firefox/130.0',
        'X-AppID': '808645',
        'X-Platform': 'h5',
        'X-Version': '8.9.7',
        'X-SessionToken': '',
        'X-UniqueID': this.uid(),
        'X-GhostID': this.uid(),
        'X-DeviceID': this.uid(),
        'X-MCC': 'id-ID',
        'sig': `XX${this.uid() + this.uid()}`
      }
    })
  }

  uid(): string {
    return crypto.randomUUID().replace(/-/g, '')
  }

  form(dt: Record<string, string>): FormData {
    const form = new FormData()
    Object.entries(dt).forEach(([k, v]) => form.append(k, v))
    return form
  }

  async upload(buff: Buffer, method: string): Promise<string> {
    const ft = await fileTypeFromBuffer(buff)
    const { mime, ext } = ft || { mime: 'image/jpeg', ext: 'jpg' }
    const { data } = await this.ins.post('/ai/web/nologin/getuploadurl', this.form({ ext, method }))
    await axios.put(data.data.upload_url, buff, { headers: { 'content-type': mime } })
    return data.data.img_url
  }

  async task({ path, sl }: { path: string, sl: (dt: any) => boolean }): Promise<any> {
    const start = Date.now()
    const timeout = 60000
    const interval = 3000
    return new Promise((resolve, reject) => {
      const check = async () => {
        if (Date.now() - start > timeout) return reject(new Error('Polling timed out'))
        try {
          const { data } = await this.ins.get(path)
          if (data?.errmsg?.trim()) return reject(new Error(`Error: ${data.errmsg}`))
          if (sl(data)) return resolve(data)
          setTimeout(check, interval)
        } catch (err) {
          reject(err)
        }
      }
      check()
    })
  }

  async edit(buff: Buffer, prompt: string): Promise<string> {
    const imgUrl = await this.upload(buff, 'wn_aistyle_nano')
    const { data } = await this.ins.post('/ai/nano/upload', this.form({ prompt, url: imgUrl }))
    if (!data.task_id) throw new Error('taskId not found')
    const res = await this.task({
      path: `/ai/nano/get_result/${data.task_id}`,
      sl: (dt) => dt.code === 0 && !!dt.image_url
    })
    return res.image_url
  }
}

export default async function nanobananaHandler(req: Request, res: Response) {
  const { url, prompt } = req.query

  if (!url || !prompt) {
    return res.status(400).json({
      status: false,
      message: "Parameter 'url' dan 'prompt' wajib diisi"
    })
  }

  try {
    const { data } = await axios.get(String(url), { responseType: 'arraybuffer', timeout: 15000 })
    const buff = Buffer.from(data)

    const grid = new GridPlus()
    const result = await grid.edit(buff, String(prompt))

    res.json({ status: true, result })
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message })
  }
}
