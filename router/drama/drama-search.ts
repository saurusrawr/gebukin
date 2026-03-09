
import { Request, Response } from "express";
import axios from "axios";

export default async function dramaSearchHandler(req: Request, res: Response) {
  try {
    const q = req.query.q as string;
    if (!q) {
      return res.status(400).json({ status: false, message: "Query 'q' wajib diisi" });
    }

    // Api si zen tumbal
    const response = await axios.get(
      `https://api.zenzxz.my.id/drama/dramabox-search?q=${encodeURIComponent(q)}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
                        "(KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36"
        }
      }
    );

    const data = response.data;

    // format output kita sendiri
    res.json({
      status: true,
      creator: "Saurus",
      query: q,
      result: data.result || [],
    });

  } catch (err: any) {
    console.error(err.message);
    res.status(500).json({
      status: false,
      message: "Gagal fetch data drama",
      error: err.message,
    });
  }
}
