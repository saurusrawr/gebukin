import { Request, Response } from "express"
import axios from "axios"

export default async function kapanimsakHandler(req: Request, res: Response) {
  const city = req.query.city as string

  if (!city || city.trim() === "") {
    return res.status(400).json({ status: false, message: "Parameter 'city' wajib diisi" })
  }

  try {
    const { data } = await axios.get(
      `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=Indonesia&method=2`,
      { timeout: 10000 }
    )

    const timings = data.data.timings
    const date = data.data.date.readable

    res.json({
      status: true,
      data: {
        city: city.toUpperCase(),
        date,
        imsak: timings.Imsak,
        subuh: timings.Fajr,
        terbit: timings.Sunrise,
        dzuhur: timings.Dhuhr,
        ashar: timings.Asr,
        maghrib: timings.Maghrib,
        isya: timings.Isha,
        midnight: timings.Midnight,
      },
    })
  } catch (error: any) {
    res.status(500).json({ status: false, message: "Kota tidak ditemukan atau API error" })
  }
}
