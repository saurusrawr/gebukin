import { Request, Response } from "express";
import axios from "axios";
import multer from "multer";
import crypto from "crypto";

const upload = multer({ storage: multer.memoryStorage() });

const GITHUB_TOKEN = "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";
const OWNER = "saurusrawr";
const BRANCH = "main";
const DOMAIN = "https://api.saurusofficial.biz.id";
let REPOS = ["storagebot"];

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/3gpp": "3gp",
  "video/quicktime": "mov",
  "audio/mpeg": "mp3",
  "audio/ogg": "ogg",
  "audio/aac": "aac",
  "application/pdf": "pdf",
  "application/zip": "zip",
  "text/plain": "txt",
};

function getExtension(mimeType: string): string {
  return EXTENSIONS[mimeType] || "bin";
}

async function ensureRepoExists(repo: string): Promise<void> {
  try {
    await axios.get(`https://api.github.com/repos/${OWNER}/${repo}`, {
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}` },
    });
  } catch (e: any) {
    if (e.response?.status === 404) {
      await axios.post(
        `https://api.github.com/user/repos`,
        { name: repo, private: false, auto_init: true },
        {
          headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            Accept: "application/vnd.github+json",
          },
        }
      );
      if (!REPOS.includes(repo)) REPOS.push(repo);
    } else {
      throw e;
    }
  }
}

async function uploadGitHub(buffer: Buffer, mimeType: string): Promise<string> {
  if (buffer.length > 25 * 1024 * 1024) {
    throw new Error("File terlalu besar! Maksimal 25MB.");
  }

  const ext = getExtension(mimeType);
  const fileName = `saurus-${Date.now()}-${crypto.randomBytes(3).toString("hex")}.${ext}`;
  const filePath = `storage/${fileName}`;
  const base64 = buffer.toString("base64");

  const targetRepo = REPOS[Math.floor(Math.random() * REPOS.length)];
  await ensureRepoExists(targetRepo);

  await axios.put(
    `https://api.github.com/repos/${OWNER}/${targetRepo}/contents/${filePath}`,
    { message: `upload ${fileName}`, content: base64, branch: BRANCH },
    {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
      },
      timeout: 30000,
    }
  );

  // Return domain sendiri, bukan raw github
  return `${DOMAIN}/storage/${targetRepo}/${fileName}`;
}

export default [
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      const file = (req as any).file;
      if (!file) {
        return res.status(400).json({ status: false, message: "file tidak ditemukan" });
      }

      const url = await uploadGitHub(file.buffer, file.mimetype);

      res.json({ status: true, url });

    } catch (err: any) {
      const msg =
        err.response?.status === 401 ? "GitHub token invalid!" :
        err.response?.status === 403 ? "Rate limit GitHub terlampaui!" :
        err.code === "ECONNABORTED" ? "Timeout menghubungi GitHub." :
        err.message || "upload gagal";

      res.status(500).json({ status: false, message: msg });
    }
  },
];
