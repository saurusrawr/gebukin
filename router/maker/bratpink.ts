import { Request, Response } from "express";
import { createCanvas } from "canvas";

export default async function bratPinkHandler(req: Request, res: Response) {
  const text = req.query.text as string;

  if (!text) {
    return res.status(400).json({
      status: false,
      message: "Parameter 'text' diperlukan"
    });
  }

  try {
    const width = 512;
    const height = 512;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // background pink
    ctx.fillStyle = "#ffb6c1";
    ctx.fillRect(0, 0, width, height);

    let fontSize = 96;

    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = "#000000";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    const maxWidth = width * 0.9;

    const words = text.split(" ");
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

    while (lines.length * fontSize > height * 0.9) {
      fontSize -= 4;
      ctx.font = `${fontSize}px Arial`;
    }

    const lineHeight = fontSize * 1.2;

    lines.forEach((l, i) => {
      ctx.fillText(l, 20, 20 + i * lineHeight);
    });

    const buffer = canvas.toBuffer("image/png");

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Length", buffer.length);
    res.end(buffer);

  } catch (err: any) {
    console.error(err);
    res.status(500).json({
      status: false,
      message: err.message || "Gagal membuat bratpink"
    });
  }
}
