/*
  Saurus For You 💌
  List Server Pterodactyl
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
    const { data } = await axios.get(`${baseUrl}/api/application/servers?page=${p}`, {
      headers, timeout: 10000
    })

    const servers = data.data
    if (!servers || servers.length === 0) {
      return res.status(404).json({ status: false, message: 'Tidak ada server yang ditemukan.' })
    }

    const list = servers.map((s: any) => ({
      id: s.attributes.id,
      identifier: s.attributes.identifier,
      name: s.attributes.name,
      description: s.attributes.description || '-',
      suspended: s.attributes.suspended,
      owner_id: s.attributes.user,
      node: s.attributes.node,
      limits: {
        memory: s.attributes.limits.memory === 0 ? 'unlimited' : (s.attributes.limits.memory / 1000) + ' GB',
        disk:   s.attributes.limits.disk   === 0 ? 'unlimited' : (s.attributes.limits.disk   / 1000) + ' GB',
        cpu:    s.attributes.limits.cpu    === 0 ? 'unlimited' : s.attributes.limits.cpu + '%',
        swap:   s.attributes.limits.swap   === 0 ? '0' : s.attributes.limits.swap + ' MB',
        io:     s.attributes.limits.io,
      },
      feature_limits: {
        databases:   s.attributes.feature_limits.databases,
        backups:     s.attributes.feature_limits.backups,
        allocations: s.attributes.feature_limits.allocations,
      },
      created_at: s.attributes.created_at,
      updated_at: s.attributes.updated_at,
    }))

    return res.json({
      status: true,
      pagination: {
        current_page: data.meta.pagination.current_page,
        total_pages:  data.meta.pagination.total_pages,
        total:        data.meta.pagination.total,
        per_page:     data.meta.pagination.per_page,
      },
      servers: list,
    })

  } catch (e: any) {
    const errMsg = e?.response?.data?.errors?.[0]?.detail || e?.response?.data?.message || e.message
    return res.status(500).json({ status: false, message: errMsg })
  }
}
