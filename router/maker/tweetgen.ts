import { Request, Response } from "express";
import { chromium } from "playwright";
import axios from "axios";
import moment from "moment-timezone";

const TWEET_CONFIG = {
  viewport: { width: 375, height: 812 },
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1",
  url: "https://www.tweetgen.com/create/tweet.html",
  timezone: "Asia/Jakarta",
};

async function handleProfileUpload(page: any, imageSource: Buffer | string) {
  if (!imageSource) return;
  await page.waitForSelector("#pfp");
  const fileBuffer =
    typeof imageSource === "string"
      ? Buffer.from((await axios.get(imageSource, { responseType: "arraybuffer" })).data)
      : imageSource;
  const input = await page.waitForSelector("#pfpFiles");
  await input.setInputFiles(fileBuffer);
  await page.click("#pfpModal .btn-primary"); // done
}

async function handleTweetImageUpload(page: any, imageSource: Buffer | string) {
  if (!imageSource) return;
  await page.waitForSelector(".tweetDropdown");
  await page.click(".tweetDropdown");
  await page.click('.tweetOptions button[onclick="queryModal(\'img\')"]');
  const fileBuffer =
    typeof imageSource === "string"
      ? Buffer.from((await axios.get(imageSource, { responseType: "arraybuffer" })).data)
      : imageSource;
  const input = await page.waitForSelector("#imgFiles");
  await input.setInputFiles(fileBuffer);
  await page.click("#imgModal .btn-primary"); // done
}

async function captureImage(page: any): Promise<Buffer> {
  await page.waitForSelector('#generatedImgModal img[src^="blob:"]', { timeout: 10000 });
  const imageEl = await page.$('#generatedImgModal img[src^="blob:"]');
  const url = await imageEl.getAttribute("src");
  const res = await page.goto(url!);
  return await res!.body();
}

export default async function tweetGenHandler(req: Request, res: Response) {
  const { name, username, tweetText, profile, image, theme, retweets, quotes, likes, client } = req.query;

  if (!name || !username || !tweetText) {
    return res.status(400).json({
      status: false,
      message: "Parameter name, username, dan tweetText wajib diisi.",
    });
  }

  let browser: any = null;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: TWEET_CONFIG.viewport,
      userAgent: TWEET_CONFIG.userAgent,
      acceptDownloads: true,
    });

    const page = await context.newPage();
    await page.goto(TWEET_CONFIG.url);

    await handleProfileUpload(page, profile as string | Buffer);
    await handleTweetImageUpload(page, image as string | Buffer);

    // isi text
    await page.fill("#name", name as string);
    await page.fill("#username", username as string);
    await page.fill("#tweetText", tweetText as string);

    // theme
    if (theme === "light") await page.click("#themeLight");
    else if (theme === "dim") await page.click("#themeDim");
    else if (theme === "dark") await page.click("#themeDark");
    else await page.click("#themeLight");

    // retweets / quotes / likes
    await page.fill("#retweets", (retweets?.toString() || "0"));
    await page.fill("#quotes", (quotes?.toString() || "0"));
    await page.fill("#likes", (likes?.toString() || "0"));

    // waktu & client
    const now = moment().tz(TWEET_CONFIG.timezone);
    await page.fill("#timeInput", now.format("HH:mm"));
    await page.fill("#dayInput", now.format("DD"));
    await page.selectOption("#monthInput", now.format("MMM"));
    await page.fill("#yearInput", now.format("YYYY"));
    await page.fill("#client", (client as string) || "Twitter for iPhone");

    // generate
    await page.click("#generateButton");
    const buffer = await captureImage(page);

    res.setHeader("Content-Type", "image/png");
    res.send(buffer);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ status: false, message: err.message || "Gagal membuat tweet." });
  } finally {
    if (browser) await browser.close();
  }
}
