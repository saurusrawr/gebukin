import { Request, Response } from "express"
import axios from "axios"
import * as cheerio from "cheerio"

async function scrapeGitHubDependents(url: string, begin: number, end: number) {
  class GitHubScraper {
    headers: { [key: string]: string }
    githubUrl: string
    begin: number
    end: number
    uri: string
    allResults: any[]

    constructor(githubUrl: string, begin: number, end: number) {
      this.headers = {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        TE: "Trailers",
      }

      this.githubUrl = githubUrl
      this.begin = begin
      this.end = end
      this.uri = this.convertToDependentsUrl(githubUrl)
      this.allResults = []
    }

    convertToDependentsUrl(githubUrl: string): string {
      const regex = /https:\/\/github\.com\/([^/]+)\/([^/]+)/
      const match = githubUrl.match(regex)
      if (match) {
        const packageAuthor = match[1]
        const packageName = match[2]
        return `https://github.com/${packageAuthor}/${packageName}/network/dependents`
      } else {
        throw new Error("Invalid GitHub URL")
      }
    }

    extractDataFromHtml($: cheerio.CheerioAPI) {
      const jsonData: any[] = []

      $('div.Box-row[data-test-id="dg-repo-pkg-dependent"]').each(
        (_, element) => {
          const username = $(element)
            .find('a[data-hovercard-type="user"]')
            .text()
            .trim()
          const avatarUrl = $(element).find("img.avatar").attr("src")
          const repoName = $(element)
            .find('a[data-hovercard-type="repository"]')
            .text()
            .trim()
          const repoUrl = `https://github.com/${username}/${repoName}`
          const stars =
            parseInt(
              $(element).find("svg.octicon-star").parent().text().trim(),
              10,
            ) || 0
          const forks =
            parseInt(
              $(element).find("svg.octicon-repo-forked").parent().text().trim(),
              10,
            ) || 0

          jsonData.push({
            user: { username, avatar_url: avatarUrl },
            repository: { name: repoName, url: repoUrl },
            stars,
            forks,
          })
        },
      )

      return jsonData
    }

    async fetchPage(uri: string, pageIndex: number) {
      try {
        const response = await axios.get(uri, { headers: this.headers })
        const $ = cheerio.load(response.data)

        const pageData = this.extractDataFromHtml($)
        this.allResults.push(...pageData)

        return {
          html: response.data,
          data: pageData,
        }
      } catch (error: any) {
        console.error(`Failed to fetch page ${pageIndex + 1}:`, error.message)
        return null
      }
    }

    getPaginationUri(html: string) {
      const $ = cheerio.load(html)
      const paginationLink = $(
        'div.BtnGroup[data-test-selector="pagination"] a',
      )
        .last()
        .attr("href")
      return paginationLink ? `${paginationLink}` : null
    }

    async getJsons() {
      let currentUri = this.uri
      let currentPage = this.begin
      let totalItems = 0

      while (currentPage < this.end) {
        const result = await this.fetchPage(currentUri, currentPage)
        if (!result) break

        const nextUri = this.getPaginationUri(result.html)
        if (!nextUri) break

        currentUri = nextUri
        currentPage++
        totalItems += result.data.length
      }

      return {
        status: true,
        total: totalItems,
        page: currentPage - this.begin + 1,
        data: this.allResults,
      }
    }
  }

  const scraper = new GitHubScraper(url, begin, end)
  return await scraper.getJsons()
}

export default async function githubDependentsHandler(req: Request, res: Response) {
  const url = req.query.url as string
  const begin = parseInt((req.query.begin as string) || "1")
  const end = parseInt((req.query.end as string) || "5")

  if (!url) {
    return res.status(400).json({ status: false, message: "Parameter 'url' is required" })
  }

  if (!url.includes("github.com")) {
    return res.status(400).json({ status: false, message: "URL must be a GitHub link" })
  }

  if (isNaN(begin) || isNaN(end) || begin < 1 || end <= begin) {
    return res.status(400).json({ status: false, message: "Invalid 'begin' or 'end' parameter" })
  }

  try {
    const result = await scrapeGitHubDependents(url, begin, end)
    res.json(result)
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message })
  }
}
