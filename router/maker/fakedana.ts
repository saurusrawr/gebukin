import { Request, Response } from "express";
import axios from "axios";
import { createCanvas, loadImage } from "canvas";
import moment from "moment-timezone";

export default async function fakeDanaHandler(req: Request, res: Response) {

  const {
    timezone,
    sender_name,
    sender_phone,
    target_name,
    target_phone,
    amount
  } = req.query;

  if (!timezone || !sender_name || !sender_phone || !target_name || !target_phone || !amount) {
    return res.status(400).json({
      status: false,
      message: "Parameter tidak lengkap"
    });
  }

  const validTimezones: any = {
    WIB: "Asia/Jakarta",
    WITA: "Asia/Makassar",
    WIT: "Asia/Jayapura"
  };

  if (!validTimezones[String(timezone).toUpperCase()]) {
    return res.status(400).json({
      status: false,
      message: "Timezone harus WIB / WITA / WIT"
    });
  }

  const nominal = parseInt(String(amount));

  if (isNaN(nominal) || nominal < 1 || nominal > 20000000) {
    return res.status(400).json({
      status: false,
      message: "Nominal harus 1 - 20.000.000"
    });
  }

  try {

    const now = moment().tz(validTimezones[String(timezone).toUpperCase()]);
    const tanggal = now.format("D MMM YYYY • HH:mm");
    const idTanggal = now.format("YYYYMMDD");

    const idTransaksi1 = idTanggal + Math.random().toString().slice(2, 13);
    const idTransaksi2 = Math.random().toString().slice(2, 21);
    const idMerchant = `•••${Math.random().toString(36).slice(2, 6)}`;

    const potongHp =
      sender_phone.toString().slice(0, 4) +
      "•".repeat(sender_phone.toString().length - 8) +
      sender_phone.toString().slice(-4);

    const imgUrl =
      "https://raw.githubusercontent.com/ChandraGO/Data-Jagoan-Project/refs/heads/master/src/MENTAHAN_DONO.jpg";

    const response = await axios.get(imgUrl, {
      responseType: "arraybuffer"
    });

    const bg = await loadImage(Buffer.from(response.data));

    const canvas = createCanvas(bg.width, bg.height);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

    const draw = (
      text: string,
      x: number,
      y: number,
      font = "23px sans-serif",
      align: CanvasTextAlign = "left",
      color = "#000"
    ) => {
      ctx.font = font;
      ctx.fillStyle = color;
      ctx.textAlign = align;
      ctx.fillText(text, x, y);
    };

    draw(`${tanggal}`, 75, 541, "17px sans-serif", "left", "#777");

    draw(`ID DANA ${potongHp}`, 639, 541, "17px sans-serif", "right", "#777");

    draw(`${nominal.toLocaleString()}`, 257, 679, "bold 27px sans-serif");

    draw(
      `ke ${target_name} - ${target_phone}`,
      73,
      708,
      "22px sans-serif"
    );

    draw(
      `Rp${nominal.toLocaleString()}`,
      623,
      809,
      "bold 30px sans-serif",
      "right",
      "#282125"
    );

    draw(idTransaksi1, 623, 1167, "22px sans-serif", "right");

    draw(idTransaksi2, 623, 1201, "22px sans-serif", "right");

    draw(idMerchant, 623, 1282, "22px sans-serif", "right");

    const buffer = canvas.toBuffer("image/png");

    res.setHeader("Content-Type", "image/png");
    res.send(buffer);

  } catch (err: any) {
    console.error(err);
    res.status(500).json({
      status: false,
      message: "Gagal, mungkin kamu kurang sigma"
    });
  }
      }
