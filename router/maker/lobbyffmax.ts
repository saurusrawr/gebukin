import { Request, Response } from "express";
import { createCanvas, loadImage, registerFont } from "canvas";

// Register font TeutonNormal.otf
registerFont("./font/TeutonNormal.otf", { family: "Teuton" });

// Background list persis original
const backgroundList = [
  'https://files.catbox.moe/jbd23e.jpg',
  'https://files.catbox.moe/7fja3z.jpg',
  'https://files.catbox.moe/8j0asj.jpg',
  'https://files.catbox.moe/jtsp76.jpg',
  'https://files.catbox.moe/0eslpr.jpg',
  'https://files.catbox.moe/ileqbd.jpg',
  'https://files.catbox.moe/utir3q.jpg',
  'https://files.catbox.moe/jl2sar.jpg',
  'https://files.catbox.moe/j235gb.jpg',
  'https://files.catbox.moe/dlxjj6.jpg',
  'https://files.catbox.moe/awoh5v.jpg',
  'https://files.catbox.moe/2wgtbb.jpg',
  'https://files.catbox.moe/hbbufy.jpg',
  'https://files.catbox.moe/0y5a57.jpg',
  'https://files.catbox.moe/jk4jtv.jpg',
  'https://files.catbox.moe/ucw40m.jpg'
];

export default async function lobbyFFHandler(req: Request, res: Response) {
  try {
    const { nickname, background } = req.query;

    if (!nickname || typeof nickname !== "string") {
      return res.status(400).json({
        status: false,
        message: "Parameter 'nickname' wajib diisi!"
      });
    }

    const max = backgroundList.length;
    let index: number;

    if (background) {
      const bgNum = parseInt(background as string, 10);
      if (isNaN(bgNum) || bgNum < 1 || bgNum > max) {
        return res.status(400).json({
          status: false,
          message: `Nomor background tidak valid. Pilih 1 sampai ${max}`
        });
      }
      index = bgNum - 1;
    } else {
      index = Math.floor(Math.random() * max);
    }

    const bgUrl = backgroundList[index];
    const bgImage = await loadImage(bgUrl);
    const canvas = createCanvas(bgImage.width, bgImage.height);
    const ctx = canvas.getContext("2d");

    // Draw background
    ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);

    // Draw nickname
    ctx.font = `bold 33px "Teuton"`;
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText(nickname, canvas.width / 2, canvas.height - 250);

    const buffer = canvas.toBuffer("image/png");

    res.setHeader("Content-Type", "image/png");
    res.send(buffer);

  } catch (err: any) {
    console.error("LOBBY FF ERROR:", err);
    res.status(500).json({
      status: false,
      message: "Gagal membuat lobby: " + (err.message || "Unknown error")
    });
  }
}
