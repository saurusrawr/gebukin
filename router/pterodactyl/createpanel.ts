/*
  Saurus For You 💌
  Create Server & User Pterodactyl automayic
*/
import { Request, Response } from 'express'
import axios from 'axios'

// generate password random 6 char (huruf + angka)
function genPassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let pw = ''
  for (let i = 0; i < 6; i++) pw += chars[Math.floor(Math.random() * chars.length)]
  return pw
}

export default async function handler(req: Request, res: Response) {
  const { domain, plta, disk, cpu, ram, username } = req.query as Record<string, string>

  if (!domain)   return res.status(400).json({ status: false, message: 'kasih domain panel nya bestie 😭 ?domain=' })
  if (!plta)     return res.status(400).json({ status: false, message: 'kasih application key (plta) nya bestie 😭 ?plta=' })
  if (!disk)     return res.status(400).json({ status: false, message: 'kasih disk (MB) nya bestie 😭 ?disk=' })
  if (!cpu)      return res.status(400).json({ status: false, message: 'kasih cpu (%) nya bestie 😭 ?cpu=' })
  if (!ram)      return res.status(400).json({ status: false, message: 'kasih ram (MB) nya bestie 😭 ?ram=' })
  if (!username) return res.status(400).json({ status: false, message: 'kasih username nya bestie 😭 ?username=' })

  const baseUrl  = domain.replace(/\/$/, '')
  const email    = `${username}@gmail.com`
  const password = genPassword()
  const nestId   = 5
  const eggId    = 15
  const locId    = 1

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
    }, { headers, timeout: 10000 })

    if (userRes.data?.errors) {
      return res.status(400).json({ status: false, message: userRes.data.errors[0]?.detail || 'Gagal buat user' })
    }

    const user = userRes.data.attributes

    const eggRes = await axios.get(`${baseUrl}/api/application/nests/${nestId}/eggs/${eggId}`, {
      headers, timeout: 10000
    })
    const eggData    = eggRes.data.attributes
    const startupCmd = eggData.startup

    const serverRes = await axios.post(`${baseUrl}/api/application/servers`, {
      name: username,
      description: `Server dibuat via KawaiiYumee API`,
      user: user.id,
      egg: eggId,
      docker_image: 'ghcr.io/parkervcp/yolks:nodejs_18',
      startup: startupCmd,
      environment: {
        INST: 'npm',
        USER_UPLOAD: '0',
        AUTO_UPDATE: '0',
        CMD_RUN: 'npm start',
        JS_FILE: 'index.js',
      },
      limits: {
        memory: parseInt(ram),
        swap: 0,
        disk: parseInt(disk),
        io: 500,
        cpu: parseInt(cpu),
      },
      feature_limits: {
        databases: 5,
        backups: 5,
        allocations: 5,
      },
      deploy: {
        locations: [locId],
        dedicated_ip: false,
        port_range: [],
      },
    }, { headers, timeout: 15000 })

    if (serverRes.data?.errors) {
      return res.status(400).json({ status: false, message: serverRes.data.errors[0]?.detail || 'Gagal buat server' })
    }

    const server = serverRes.data.attributes

    return res.json({
      status: true,
      message: '✅ User & Server berhasil dibuat!',
      user: {
        id: user.id,
        username: user.username,
        email,
        password,
        root_admin: user.root_admin,
        created_at: user.created_at,
      },
      server: {
        id: server.id,
        uuid: server.uuid,
        name: server.name,
        identifier: server.identifier,
        status: server.status || 'installing',
        limits: {
          ram: `${ram} MB`,
          disk: `${disk} MB`,
          cpu: `${cpu}%`,
          swap: '0 MB',
          io: 500,
        },
        feature_limits: {
          databases: 5,
          backups: 5,
          allocations: 5,
        },
        egg: {
          nest_id: nestId,
          egg_id: eggId,
          name: eggData.name,
          docker_image: eggData.docker_image,
        },
        location_id: locId,
        node: server.node,
        created_at: server.created_at,
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
