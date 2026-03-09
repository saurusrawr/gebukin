import { Request, Response } from "express";
import axios from "axios";

const OWNER = "saurusrawr";
const BRANCH = "main";

export default async (req: Request, res: Response) => {
  try {
    const { repo, filename } = req.params;
    const rawUrl = `https://raw.githubusercontent.com/${OWNER}/${repo}/${BRANCH}/storage/${filename}`;

    const file = await axios.get(rawUrl, { responseType: "arraybuffer", timeout: 10000 });
    const contentType = file.headers["content-type"] || "application/octet-stream";

    res.set("Content-Type", contentType);
    res.set("Cache-Control", "public, max-age=31536000");
    res.send(Buffer.from(file.data));

  } catch {
    res.status(404).json({ status: false, message: "file tidak ditemukan" });
  }
};
