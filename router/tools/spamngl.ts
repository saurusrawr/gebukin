// file: router/maker/nglspam.ts
import { Request, Response } from "express";
import fetch from "node-fetch";
import crypto from "crypto";

export default async function nglSpamHandler(req: Request, res: Response) {
  try {
    const { link, message, count } = req.query;

    if (!link || !message || !count) {
      return res.status(400).json({ status: false, message: "link, message, count wajib diisi" });
    }

    const spamCount = parseInt(count as string, 10);
    if (isNaN(spamCount) || spamCount < 1 || spamCount > 50) {
      return res.status(400).json({ status: false, message: "count harus antara 1-50" });
    }

    const username = (link as string).split("/").pop()?.trim();
    if (!username) return res.status(400).json({ status: false, message: "username tidak valid" });

    let counter = 0;

    const spamLoop = async () => {
      if (counter >= spamCount) return;

      try {
        const deviceId = crypto.randomBytes(21).toString("hex");

        const response = await fetch("https://ngl.link/api/submit", {
          method: "POST",
          headers: {
            "User-Agent": "Mozilla/5.0",
            "Accept": "*/*",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "X-Requested-With": "XMLHttpRequest",
            "Referer": `https://ngl.link/${username}`,
            "Origin": "https://ngl.link",
          },
          body: `username=${username}&question=${message}&deviceId=${deviceId}&gameSlug=&referrer=`,
        });

        if (response.status === 200) counter++;
        else await new Promise(r => setTimeout(r, 25000)); // ratelimit delay
      } catch (err) {
        console.error("NGL Error:", err);
        await new Promise(r => setTimeout(r, 5000));
      }

      setTimeout(spamLoop, 500);
    };

    spamLoop();

    res.json({
      status: true,
      message: `Mulai spam ke @${username}, total: ${spamCount}`,
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ status: false, message: err.message || "Internal Server Error" });
  }
}
