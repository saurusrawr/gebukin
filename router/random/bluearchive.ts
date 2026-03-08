import { Request, Response } from "express";

export default async function blueArchiveHandler(req: Request, res: Response) {
  try {
    const response = await fetch(
      "https://raw.githubusercontent.com/saurusrawr/dbsaurus/refs/heads/main/archiveblue.json"
    );

    const images = (await response.json()) as string[];

    const random = images[Math.floor(Math.random() * images.length)];

    const img = await fetch(random);
    const buffer = Buffer.from(await img.arrayBuffer());

    res.set("Content-Type", "image/jpeg");
    res.send(buffer);

  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: false,
      message: "error mengambil gambar"
    });
  }
}
