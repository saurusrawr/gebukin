import { Request, Response } from "express";
import axios from "axios";

export default async function blueArchiveHandler(req: Request, res: Response) {
  try {
    const { data: images } = await axios.get<string[]>(
      "https://raw.githubusercontent.com/saurusrawr/dbsaurus/main/archiveblue.json"
    );

    if (!Array.isArray(images) || images.length === 0) {
      return res.status(500).json({ status: false, message: "data kosong" });
    }

    const random = images[Math.floor(Math.random() * images.length)];

    const img = await axios.get(random, { responseType: "arraybuffer" });
    const contentType = img.headers["content-type"] || "image/jpeg";

    res.set("Content-Type", contentType);
    res.send(Buffer.from(img.data));

  } catch (err) {
    console.error(err);
    res.status(500).json({ status: false, message: "error mengambil gambar" });
  }
}
