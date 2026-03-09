import { Request, Response } from "express"
import axios from "axios"

export default async function jadwalSholatHandler(req: Request, res: Response) {
  const city = req.query.city as string
  const lat = req.query.lat as string
  const lon = req.query.lon as string

  if (!city && (!lat || !lon)) {
    return res.status(400).json({
      status: false,
      message: "Isi parameter 'city' atau 'lat' & 'lon'",
    })
  }

  try {
    let url = ""

    if (lat && lon) {
      url = `https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=2`
    } else {
      url = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=Indonesia&method=2`
    }

    const { data } = await axios.get(url, { timeout: 10000 })

    const timings = data.data.timings
    const date = data.data.date
    const meta = data.data.meta

    res.json({
      status: true,
      data: {
        location: {
          city: city || null,
          latitude: meta.latitude,
          longitude: meta.longitude,
          timezone: meta.timezone,
        },
        date: {
          readable: date.readable,
          hijri: `${date.hijri.day} ${date.hijri.month.en} ${date.hijri.year} H`,
        },
        jadwal: {
          imsak: timings.Imsak,
          subuh: timings.Fajr,
          terbit: timings.Sunrise,
          dhuha: timings.Dhuha,
          dzuhur: timings.Dhuhr,
          ashar: timings.Asr,
          maghrib: timings.Maghrib,
          isya: timings.Isha,
          midnight: timings.Midnight,
        },
      },
    })
  } catch (error: any) {
    res.status(500).json({ status: false, message: "Kota tidak ditemukan atau API error" })
  }
}
