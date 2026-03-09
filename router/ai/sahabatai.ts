import { Request, Response } from "express"
import axios from "axios";

async function sahabatAIChat(message: string, cookie: string) {
  try {
    const response = await axios({
      method: "post",
      url: "https://sahabat-ai.com/v1/chat/session",
      headers: {
        "authority": "sahabat-ai.com",
        "accept": "text/event-stream, application/json",
        "accept-language": "en",
        "content-type": "application/json",
        "cookie": `sID=${cookie}`,
        "origin": "https://sahabat-ai.com",
        "referer": "https://sahabat-ai.com/chat",
        "sec-ch-ua": "\"Not A(Brand\";v=\"8\", \"Chromium\";v=\"132\"",
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": "\"Android\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36",
        "x-client-id": "android",
      },
      data: { message: message },
      responseType: "stream",
    });

    let result = "";
    await new Promise<void>((resolve, reject) => {
      response.data.on("data", (chunk: Buffer) => {
        const lines = chunk.toString().split("\n");
        lines.forEach((line) => {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              if (data.type === "result_stream") {
                result += data.data;
              }
            } catch (parseError) {
              // Ignore non-JSON lines
            }
          }
        });
      });

      response.data.on("end", () => {
        resolve();
      });

      response.data.on("error", (error: Error) => {
        reject(error);
      });
    });
    return result;
  } catch (error: any) {
    throw new Error(error.message || "Failed to get response from API");
  }
}
