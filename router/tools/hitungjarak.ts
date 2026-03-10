import { Request, Response } from "express"
import axios from "axios"

async function getCoordinates(city: string): Promise<{ lat: number, lon: number, display_name: string } | null> {
  try {
    const { data } = await axios.get(`https://nominatim.openstreetmap.org/search`, {
      params: { q: city, format: 'json', limit: 1, countrycodes: 'id' },
      headers: { 'User-Agent': 'KawaiiYumeeAPI/1.0' },
      timeout: 8000
    })
    if (!data || data.length === 0) return null
    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
      display_name: data[0].display_name
    }
  } catch {
    return null
  }
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // radius bumi km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function formatJarak(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} meter`
  return `${km.toFixed(1)} km`
}

function estimasiWaktu(km: number): { motor: string, mobil: string, jalan_kaki: string } {
  const motor = km / 40    // rata-rata 40 km/jam
  const mobil = km / 60    // rata-rata 60 km/jam
  const jalan = km / 5     // rata-rata 5 km/jam

  const fmt = (jam: number) => {
    const h = Math.floor(jam)
    const m = Math.round((jam - h) * 60)
    if (h === 0) return `${m} menit`
    if (m === 0) return `${h} jam`
    return `${h} jam ${m} menit`
  }

  return {
    motor: fmt(motor),
    mobil: fmt(mobil),
    jalan_kaki: fmt(jalan)
  }
}

export default async function hitungjarakHandler(req: Request, res: Response) {
  const { kota1, kota2 } = req.query

  if (!kota1 || !kota2) {
    return res.status(400).json({
      status: false,
      message: "Parameter 'kota1' dan 'kota2' wajib diisi. Contoh: kota1=Semarang&kota2=Solo"
    })
  }

  try {
    const [loc1, loc2] = await Promise.all([
      getCoordinates(String(kota1)),
      getCoordinates(String(kota2))
    ])

    if (!loc1) return res.status(404).json({ status: false, message: `Kota '${kota1}' tidak ditemukan` })
    if (!loc2) return res.status(404).json({ status: false, message: `Kota '${kota2}' tidak ditemukan` })

    const km = haversine(loc1.lat, loc1.lon, loc2.lat, loc2.lon)
    const estimasi = estimasiWaktu(km)

    res.json({
      status: true,
      dari: {
        nama: String(kota1),
        lokasi: loc1.display_name,
        koordinat: { lat: loc1.lat, lon: loc1.lon }
      },
      ke: {
        nama: String(kota2),
        lokasi: loc2.display_name,
        koordinat: { lat: loc2.lat, lon: loc2.lon }
      },
      jarak: formatJarak(km),
      jarak_km: parseFloat(km.toFixed(2)),
      estimasi_waktu: estimasi
    })
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message })
  }
      }
