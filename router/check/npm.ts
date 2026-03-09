import { Request, Response } from "express"
import axios from "axios"

async function npmstalk(packageName: string) {
  const stalk = await axios.get("https://registry.npmjs.org/" + packageName, { timeout: 15000 })
  const versions = stalk.data.versions
  const allver = Object.keys(versions)
  const verLatest = allver[allver.length - 1]
  const verPublish = allver[0]
  const packageLatest = versions[verLatest]

  return {
    name: packageName,
    description: stalk.data.description || null,
    author: stalk.data.author?.name || null,
    license: packageLatest.license || null,
    homepage: stalk.data.homepage || null,
    repository: stalk.data.repository?.url || null,
    version_latest: verLatest,
    version_first: verPublish,
    total_versions: allver.length,
    latest_dependencies: Object.keys(packageLatest.dependencies || {}).length,
    first_dependencies: Object.keys(versions[verPublish].dependencies || {}).length,
    published_at: stalk.data.time.created,
    latest_published_at: stalk.data.time[verLatest],
    keywords: stalk.data.keywords || [],
  }
}

export default async function npmHandler(req: Request, res: Response) {
  const q = req.query.q as string

  if (!q || q.trim() === "") {
    return res.status(400).json({ status: false, message: "Parameter 'q' wajib diisi (nama package npm)" })
  }

  try {
    const data = await npmstalk(q.trim())
    res.json({ status: true, data })
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message })
  }
}
