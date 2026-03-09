import { Request, Response } from "express"
import axios from "axios"

async function laheluDownloader(url: string) {
  const postID = url.replace("https://lahelu.com/post/", "")

  const headers = {
    "Host": "lahelu.com",
    "accept": "application/json, text/plain, */*",
    "user-agent": "Mozilla/5.0 (Linux; Android 11; SM-A207F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.141 Mobile Safari/537.36",
    "sec-fetch-site": "same-origin",
    "sec-fetch-mode": "cors",
    "sec-fetch-dest": "empty",
    "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
  }

  try {
    const response = await axios.get("https://lahelu.com/api/post/get", {
      headers,
      params: { postID },
    })

    if (response.status === 200) {
      const data = response.data
      const postInfo = data.postInfo || {}
      const {
        postID: extractedPostID,
        userID,
        title,
        media,
        sensitive = false,
        hashtags = [],
        createTime = 0,
      } = postInfo

      return {
        status: true,
        user_id: userID,
        post_id: extractedPostID,
        result: postInfo,
        title,
        media,
        sensitive,
        hashtags,
        create_time: new Date(createTime * 1000).toISOString(),
      }
    }
    return null
  } catch (error: any) {
    console.error("Error fetching Lahelu post data:", error.message)
    throw new Error("Failed to get response from Lahelu API")
  }
}
