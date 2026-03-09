import { Request, Response } from "express";
import axios from "axios";
import { createCanvas, loadImage } from "canvas";

export default async function bratGuraHandler(req: Request, res: Response) {
  const text = req.query.text as string;

  if (!text) {
    return res.status(400).json({
      status: false,
      message: "Parameter 'text' diperlukan"
    });
  }

  try {
    const response = await axios.get(
      "https://raw.githubusercontent.com/alifalfarel25-commits/dat4/main/uploads/alip-clutch-1770001033541.jpg",
      { responseType: "arraybuffer" }
    );

    const buffer = Buffer.from(response.data);
    const img = await loadImage(buffer);

    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(img, 0, 0, img.width, img.height);

    const areaX = img.width * 0.56;
    const areaY = img.height * 0.28;
    const areaWidth = img.width * 0.36;
    const areaHeight = img.height * 0.32;

    let fontSize = img.height * 0.11;

    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = "#000";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    const words = text.split(" ");
    let lines: string[] = [];
    let line = "";

    for (let word of words) {
      const testLine = line ? `${line} ${word}` : word;
      const testWidth = ctx.measureText(testLine).width;

      if (testWidth > areaWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = testLine;
      }
    }

    if (line) lines.push(line);

    while (lines.length * fontSize * 1.25 > areaHeight) {
      fontSize -= 2;
      ctx.font = `${fontSize}px Arial`;

      let tmpLines: string[] = [];
      let tmpLine = "";

      for (let word of words) {
        const testLine = tmpLine ? `${tmpLine} ${word}` : word;
        const testWidth = ctx.measureText(testLine).width;

        if (testWidth > areaWidth && tmpLine) {
          tmpLines.push(tmpLine);
          tmpLine = word;
        } else {
          tmpLine = testLine;
        }
      }

      if (tmpLine) tmpLines.push(tmpLine);
      lines = tmpLines;
    }

    const lineHeight = fontSize * 1.25;

    ctx.shadowColor = "rgba(0,0,0,0.22)";
    ctx.shadowBlur = 2;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.globalAlpha = 0.95;

    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(
        lines[i],
        areaX,
        areaY + i * lineHeight
      );
    }

    ctx.globalAlpha = 1;

    const imageBuffer = canvas.toBuffer("image/png");

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Length", imageBuffer.length);
    res.send(imageBuffer);

  } catch (err: any) {
    console.error(err);
    res.status(500).json({
      status: false,
      message: err.message || "Gagal membuat bratgura"
    });
  }
      }
