import { Request, Response } from "express";
import axios from "axios";
import multer from "multer";

const upload = multer();

const GITHUB_TOKEN = "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";
const REPO_OWNER = "saurusrawr";
const REPO_NAME = "storagebot";
const BRANCH = "main";

function randomName(ext: string) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 10; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id + ext;
}

export default [
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          status: false,
          message: "file tidak ditemukan"
        });
      }

      const ext = "." + req.file.mimetype.split("/")[1];
      const filename = randomName(ext);

      const base64 = req.file.buffer.toString("base64");

      const githubUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/storage/${filename}`;

      await axios.put(
        githubUrl,
        {
          message: `upload ${filename}`,
          content: base64,
          branch: BRANCH
        },
        {
          headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            Accept: "application/vnd.github+json"
          }
        }
      );

      res.json({
        status: true,
        filename,
        url: `https://saurusofficial.biz.id/${filename}`
      });

    } catch (err: any) {
      console.error(err.response?.data || err);
      res.status(500).json({
        status: false,
        message: "upload gagal"
      });
    }
  }
];
