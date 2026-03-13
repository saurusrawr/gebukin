/*
  Saurus For You 💌
  Create Admin User Pterodactyl
*/
import { Request, Response } from 'express'
import axios from 'axios'

function genPassword(length = 12): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()'
  let pw = ''
  for (let i = 0; i < length; i++) pw += chars[Math.floor(Math.random() * chars.length)]
  return pw
}

export default async function handler(req: Request, res: Response) {
  const { domain, plta, username } = req.query as Record<string, string>

  if (!domain)   return res.status(400).json({ status: false, message: 'kasih domain panel nya bestie 😭 ?domain=' })
  if (!plta)     return res.status(400).json({ status: false, message: 'kasih application key (plta) nya bestie 😭 ?plta=' })
  if (!username) return res.status(400).json({ status: false, message: 'kasih username nya bestie 😭 ?username=' })

  const baseUrl  = domain.replace(/\/$/, '')
  const email    = `${username}@gmail.com`
  const password = genPassword(12)

  const headers = {
    Authorization: `Bearer ${plta}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

  try {
    const userRes = await axios.post(`${baseUrl}/api/application/users`, {
      email,
      username,
      first_name: username,
      last_name: username,
      language: 'en',
      password,
      root_admin: true,
    }, { headers, timeout: 10000 })

    if (userRes.data?.errors) {
      return res.status(400).json({ status: false, message: userRes.data.errors[0]?.detail || 'Gagal buat user' })
    }

    const user = userRes.data.attributes

    return res.json({
      status: true,
      message: '✅ User Admin berhasil dibuat!',
      user: {
        id: user.id,
        username: user.username,
        email,
        password,
        root_admin: true,
        created_at: user.created_at,
      },
      login: {
        url: baseUrl,
        domain: baseUrl.replace('https://', ''),
        email,
        password,
      },
    })

  } catch (e: any) {
    const errMsg = e?.response?.data?.errors?.[0]?.detail || e?.response?.data?.message || e.message
    return res.status(500).json({ status: false, message: errMsg })
  }
}
