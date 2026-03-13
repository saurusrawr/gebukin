/*
  Saurus For You 💌
  List User Pterodactyl
*/
import { Request, Response } from 'express'
import axios from 'axios'

export default async function handler(req: Request, res: Response) {
  const { domain, plta, page } = req.query as Record<string, string>

  if (!domain) return res.status(400).json({ status: false, message: 'kasih domain panel nya bestie 😭 ?domain=' })
  if (!plta)   return res.status(400).json({ status: false, message: 'kasih application key (plta) nya bestie 😭 ?plta=' })

  const baseUrl = domain.replace(/\/$/, '')
  const p = page || '1'

  const headers = {
    Authorization: `Bearer ${plta}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

  try {
    const { data } = await axios.get(`${baseUrl}/api/application/users?page=${p}`, {
      headers, timeout: 10000
    })

    const users = data.data
    if (!users || users.length === 0) {
      return res.status(404).json({ status: false, message: 'Tidak ada user yang ditemukan.' })
    }

    const list = users.map((u: any) => ({
      id:          u.attributes.id,
      username:    u.attributes.username,
      email:       u.attributes.email,
      first_name:  u.attributes.first_name,
      last_name:   u.attributes.last_name,
      language:    u.attributes.language,
      root_admin:  u.attributes.root_admin,
      uuid:        u.attributes.uuid,
      created_at:  u.attributes.created_at,
      updated_at:  u.attributes.updated_at,
    }))

    return res.json({
      status: true,
      pagination: {
        current_page: data.meta.pagination.current_page,
        total_pages:  data.meta.pagination.total_pages,
        total:        data.meta.pagination.total,
        per_page:     data.meta.pagination.per_page,
      },
      users: list,
    })

  } catch (e: any) {
    const errMsg = e?.response?.data?.errors?.[0]?.detail || e?.response?.data?.message || e.message
    return res.status(500).json({ status: false, message: errMsg })
  }
}
