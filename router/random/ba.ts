import { Request, Response } from "express";

export default async function waifuHandler(req: Request, res: Response) {
  try {
    const apiResponse = await fetch(
      "https://raw.githubusercontent.com/saurusrawr/dbsaurus/refs/heads/main/archiveblue.json"
    );

    if (!apiResponse.ok) throw new Error("Gagal mengambil JSON");

    const images: string[] = await apiResponse.json();

    if (!Array.isArray(images) || images.length === 0) {
      throw new Error("Data gambar kosong");
    }

    // ambil random image
    const randomImage = images[Math.floor(Math.random() * images.length)];

    const imageResponse = await fetch(randomImage);
    if (!imageResponse.ok) throw new Error("Gagal mengambil gambar");

    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.set("Content-Type", "image/jpeg");
    res.send(buffer);

  } catch (error: any) {
    console.error("Error:", error);
    res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
}
