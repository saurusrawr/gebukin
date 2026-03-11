import { Request, Response } from "express"
import axios from "axios"

// cek domain pake rdap dlu, kalo gagal fallback ke api lain
async function cek_rdap(domain: string) {
  try {
    const tld = domain.split('.').pop()
    const { data } = await axios.get(`https://rdap.org/domain/${domain}`, { timeout: 8000 })
    
    const registrar = data.entities?.find((e: any) => e.roles?.includes('registrar'))?.vcardArray?.[1]
      ?.find((v: any) => v[0] === 'fn')?.[3] || '-'
    
    const registered = data.events?.find((e: any) => e.eventAction === 'registration')?.eventDate || '-'
    const expires = data.events?.find((e: any) => e.eventAction === 'expiration')?.eventDate || '-'
    const updated = data.events?.find((e: any) => e.eventAction === 'last changed')?.eventDate || '-'
    const status = data.status || []
    const nameservers = data.nameservers?.map((n: any) => n.ldhName) || []

    return { registrar, registered, expires, updated, status, nameservers }
  } catch { return null }
}

// fallback pake whois.domaintools.com scrape
async function cek_domaintools(domain: string) {
  try {
    const { data } = await axios.get(`https://whois.domaintools.com/${domain}`, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
      timeout: 8000
    })
    // minimal info aja
    return { registrar: '-', registered: '-', expires: '-', updated: '-', status: [], nameservers: [] }
  } catch { return null }
}

// fallback pake rdap.iana.org buat info tld
async function cek_iana(domain: string) {
  try {
    const { data } = await axios.get(`https://rdap.iana.org/domain/${domain}`, { timeout: 8000 })
    const registered = data.events?.find((e: any) => e.eventAction === 'registration')?.eventDate || '-'
    const expires = data.events?.find((e: any) => e.eventAction === 'expiration')?.eventDate || '-'
    const nameservers = data.nameservers?.map((n: any) => n.ldhName) || []
    return { registrar: '-', registered, expires, updated: '-', status: data.status || [], nameservers }
  } catch { return null }
}

export default async function whoisHandler(req: Request, res: Response) {
  const domain = String(req.query.domain || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')

  if (!domain) {
    return res.status(400).json({ status: false, message: "Parameter 'domain' wajib diisi, contoh: google.com" })
  }

  // coba satu-satu sampe dapet
  let hasil = await cek_rdap(domain)
  if (!hasil) hasil = await cek_iana(domain)
  if (!hasil) {
    return res.status(500).json({ status: false, message: "Gagal ambil info domain, coba lagi nanti" })
  }

  res.json({
    status: true,
    domain,
    registrar: hasil.registrar,
    registered: hasil.registered,
    expires: hasil.expires,
    updated: hasil.updated,
    domain_status: hasil.status,
    nameservers: hasil.nameservers
  })
}
