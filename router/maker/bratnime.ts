import { Request, Response } from "express";
import axios from "axios";
import { createCanvas, loadImage } from "canvas";

export default async function bratAnimeHandler(req: Request, res: Response) {
  const { text } = req.query;

  if (!text) {
    return res.status(400).json({
      status: false,
      message: "Parameter text wajib diisi"
    });
  }

  try {

    const response = await axios.get(
      "http://aliceecdn.vercel.app/file/99888ee439.jpg",
      { responseType: "arraybuffer" }
    );

    const templateBuffer = Buffer.from(response.data);
    const img = await loadImage(templateBuffer);

    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(img, 0, 0, img.width, img.height);

    const paperX = img.width * 0.38;
    const paperY = img.height * 0.45;
    const paperWidth = img.width * 0.54;
    const paperHeight = img.height * 0.44;

    let fontSize = Math.min(paperWidth / 8.5, paperHeight / 4.2);

    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = "black";

    const maxWidth = paperWidth * 0.85;

    const words = String(text).split(" ");
    let lines: string[] = [];
    let line = "";

    for (const word of words) {
      const testLine = line + (line ? " " : "") + word;
      const testWidth = ctx.measureText(testLine).width;

      if (testWidth > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = testLine;
      }
    }

    if (line) lines.push(line);

    while (lines.length * fontSize > paperHeight * 0.8) {
      fontSize -= 1;
      ctx.font = `${fontSize}px Arial`;

      let tempLines: string[] = [];
      let tempLine = "";

      for (const word of words) {
        const testLine = tempLine + (tempLine ? " " : "") + word;
        const testWidth = ctx.measureText(testLine).width;

        if (testWidth > maxWidth && tempLine) {
          tempLines.push(tempLine);
          tempLine = word;
        } else {
          tempLine = testLine;
        }
      }

      if (tempLine) tempLines.push(tempLine);
      lines = tempLines;
    }

    const lineHeight = fontSize * 1.25;
    const textHeight = lines.length * lineHeight;

    const textStartY =
      paperY + (paperHeight - textHeight) / 2 + fontSize * 0.5;

    ctx.save();

    ctx.translate(paperX + paperWidth / 2 + 15, textStartY + textHeight / 2);
    ctx.rotate(0.05);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.shadowColor = "rgba(0,0,0,0.3)";
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(
        lines[i],
        0,
        (i - (lines.length - 1) / 2) * lineHeight
      );
    }

    ctx.restore();

    const buffer = canvas.toBuffer("image/png");

    res.setHeader("Content-Type", "image/png");
    res.send(buffer);

  } catch (err: any) {
    console.error(err);
    res.status(500).json({
      status: false,
      message: "Gagal membuat gambar cik😭"
    });
  }
}
