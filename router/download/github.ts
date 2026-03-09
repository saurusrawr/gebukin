import { Request, Response } from "express"
import axios from "axios"

interface GitHubUrlParserOptions {
  userAgent?: string
  token?: string
}

class GitHubUrlParser {
  private headers: { [key: string]: string }

  constructor(options: GitHubUrlParserOptions = {}) {
    this.headers = {
      "User-Agent": options.userAgent || "github-data-fetcher",
      ...(options.token && { Authorization: `token ${options.token}` }),
    }
  }

  parseUrl(url: string) {
    const patterns = {
      repo: /https?:\/\/github\.com\/([^/]+)\/([^/]+)(?:\/)?$/,
      file: /https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)/,
      raw: /https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)/,
      gist: /https?:\/\/gist\.github\.com\/([^/]+)\/([a-f0-9]+)/,
    }

    for (const [type, regex] of Object.entries(patterns)) {
      const match = url.match(regex)
      if (match) {
        return { type, match }
      }
    }

    throw new Error(
      "URL tidak valid. Format yang didukung: repo, file, raw, atau gist URL GitHub",
    )
  }

  async getRepoData(user: string, repo: string) {
    const apiUrl = `https://api.github.com/repos/${user}/${repo}`
    const response = await axios.get(apiUrl, {
      headers: this.headers,
      timeout: 30000,
    })

    const {
      default_branch,
      description,
      stargazers_count,
      forks_count,
      topics,
    } = response.data

    return {
      type: "repository",
      owner: user,
      repo: repo,
      description,
      default_branch,
      stars: stargazers_count,
      forks: forks_count,
      topics,
      download_url: `https://github.com/${user}/${repo}/archive/refs/heads/${default_branch}.zip`,
      clone_url: `https://github.com/${user}/${repo}.git`,
      api_url: apiUrl,
    }
  }

  async getFileData(user: string, repo: string, branch: string, path: string) {
    const apiUrl = `https://api.github.com/repos/${user}/${repo}/contents/${path}?ref=${branch}`
    const response = await axios.get(apiUrl, {
      headers: this.headers,
      timeout: 30000,
    })

    return {
      type: "file",
      owner: user,
      repo: repo,
      branch,
      path,
      name: response.data.name,
      size: response.data.size,
      raw_url: response.data.download_url,
      content: Buffer.from(response.data.content, "base64").toString(),
      sha: response.data.sha,
      api_url: apiUrl,
    }
  }

  async getGistData(user: string, gistId: string) {
    const apiUrl = `https://api.github.com/gists/${gistId}`
    const response = await axios.get(apiUrl, {
      headers: this.headers,
      timeout: 30000,
    })

    const files = Object.entries(response.data.files).map(
      ([filename, file]: [string, any]) => ({
        name: filename,
        language: (file as any).language,
        raw_url: (file as any).raw_url,
        size: (file as any).size,
        content: (file as any).content,
      }),
    )

    return {
      type: "gist",
      owner: user,
      gist_id: gistId,
      description: response.data.description,
      files,
      created_at: response.data.created_at,
      updated_at: response.data.updated_at,
      comments: response.data.comments,
      api_url: apiUrl,
    }
  }

  async getData(url: string) {
    try {
      const { type, match } = this.parseUrl(url)

      switch (type) {
        case "repo":
          return await this.getRepoData(match[1], match[2])
        case "file":
          return await this.getFileData(match[1], match[2], match[3], match[4])
        case "gist":
          return await this.getGistData(match[1], match[2])
        default:
          throw new Error("Format URL tidak didukung")
      }
    } catch (error: any) {
      throw new Error(`Error mengambil data: ${error.message}`)
    }
  }
}

async function githubScrape(url: string) {
  const github = new GitHubUrlParser({})
  return await github.getData(url)
}

export default async function githubHandler(req: Request, res: Response) {
  const url = (req.query.url as string) || (req.body.url as string)

  if (!url) {
    return res.status(400).json({ status: false, message: "Parameter 'url' is required" })
  }

  if (!url.includes("github.com") && !url.includes("githubusercontent.com")) {
    return res.status(400).json({ status: false, message: "URL must be a GitHub link" })
  }

  try {
    const result = await githubScrape(url)
    res.json({ status: true, data: result })
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message })
  }
}
