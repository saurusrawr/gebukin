import { Request, Response } from "express"
import axios from "axios"
import multer from "multer"
import crypto from "crypto"
import path from "path"

const GITHUB_TOKEN = "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"
const GITHUB_OWNER = "saurusrawr"
const GITHUB_REPO = "cdn"
const GITHUB_BRANCH = "main"
const CDN_DOMAIN = "https://cdn.kawaiiyumee.web.id"

// File yang diblokir
const BLOCKED_EXT = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.msi', '.dll', '.sys', '.com', '.scr', '.pif', '.jar', '.apk']

// Max 25MB
const MAX_SIZE = 25 * 1024 * 1024

const storage = multer.memoryStorage()
export const middleware = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    if (BLOCKED_EXT.includes(ext)) {
      return cb(new Error(`Tipe file '${ext}' tidak diizinkan`))
    }
    cb(null, true)
  }
}).single("file")

function randomId(length = 6): string {
  return crypto.randomBytes(length).toString('base64url').substring(0, length).toLowerCase()
}

async function uploadToGithub(filename: string, buffer: Buffer, mimeType: string): Promise<string> {
  const content = buffer.toString('base64')
  const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filename}`

  await axios.put(apiUrl, {
    message: `upload ${filename}`,
    content,
    branch: GITHUB_BRANCH
  }, {
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json'
    },
    timeout: 30000
  })

  return `${CDN_DOMAIN}/${filename}`
}

export default async function cdnuploadHandler(req: Request, res: Response) {
  if (!req.file) {
    return res.status(400).json({ status: false, message: "File wajib diupload. Gunakan form-data dengan field 'file'" })
  }

  try {
    const ext = path.extname(req.file.originalname).toLowerCase() || '.bin'
    const id = randomId(6)
    const filename = `${id}${ext}`

    const cdnUrl = await uploadToGithub(filename, req.file.buffer, req.file.mimetype)

    res.json({
      status: true,
      filename,
      url: cdnUrl,
      size: req.file.size,
      type: req.file.mimetype
    })
  } catch (err: any) {
    const msg = err?.response?.data?.message || err.message
    res.status(500).json({ status: false, message: msg })
  }
}
