import { Request, Response } from "express";
import axios from "axios";

export default async function checkWebHandler(req: Request, res: Response) {
  try {
    const { domain } = req.query;

    if (!domain || typeof domain !== "string") {
      return res.status(400).json({
        status: false,
        message: "Parameter 'domain' wajib diisi! Contoh: google.com"
      });
    }

    // Pastikan ada protocol
    const url = domain.startsWith("http") ? domain : `https://${domain}`;

    let status = "UNKNOWN";
    let responseTime = 0;

    try {
      const start = Date.now();
      const response = await axios.get(url, { timeout: 5000 });
      const end = Date.now();

      responseTime = end - start;
      status = response.status >= 200 && response.status < 400 ? "UP ✅" : "DOWN ❌";
    } catch (err: any) {
      status = "DOWN ❌";
    }

    res.json({
      status: true,
      domain,
      result: status,
      responseTime: responseTime + "ms"
    });

  } catch (err: any) {
    console.error("CHECKWEB ERROR:", err);
    res.status(500).json({
      status: false,
      message: "Terjadi kesalahan: " + (err.message || "Unknown error")
    });
  }
}
