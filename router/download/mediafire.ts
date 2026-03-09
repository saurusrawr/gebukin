import { Request, Response } from "express"
import { chromium } from "playwright"

async function mediafireScrape(url: string) {
  let browser: any;
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
        "--disable-web-security",
        "--disable-features=IsolateOrigins,site-per-process",
        "--disable-blink-features=AutomationControlled",
        "--no-first-run",
        "--no-default-browser-check",
      ],
    });

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 800 },
      javaScriptEnabled: true,
      bypassCSP: true,
      ignoreHTTPSErrors: true,
      acceptDownloads: true,
      extraHTTPHeaders: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
    });

    const page = await context.newPage();

    await page.route("**/*", (route) => {
      const resourceType = route.request().resourceType();
      if (["image", "stylesheet", "font", "media"].includes(resourceType)) {
        route.abort();
      } else {
        route.continue();
      }
    });

    try {
      await page.goto(url, {
        timeout: 60000,
        waitUntil: "networkidle",
      });
    } catch (navError) {
      console.log("Navigation issue, trying alternative approach...");
    }

    await page.waitForTimeout(3000);

    try {
      const popupSelectors = [
        ".close-btn",
        ".modal-close",
        '[data-dismiss="modal"]',
        ".popup-close",
      ];

      for (const selector of popupSelectors) {
        const popup = await page.$(selector);
        if (popup) {
          await popup.click();
          await page.waitForTimeout(1000);
        }
      }
    } catch (e) {
      // Ignore popup handling errors
    }

    const fileInfo = await page.evaluate(() => {
      const getFileName = () => {
        const selectors = [
          ".filename",
          ".dl-filename",
          "h1.filename",
          ".file-title",
          ".file_name",
          ".dl-file-name",
        ];

        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent?.trim()) {
            return element.textContent.trim();
          }
        }

        const title = document.title;
        if (title && title.includes(" - ")) {
          return title.split(" - ")[0].trim();
        }

        return "Unknown";
      };

      const getFileSize = () => {
        const selectors = [
          ".details > li:first-child > span",
          ".file_size",
          ".dl-info > div:first-child",
          ".file-size",
          ".size",
        ];

        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent?.trim()) {
            return element.textContent.trim();
          }
        }

        const downloadBtn = document.querySelector("#downloadButton");
        if (downloadBtn && downloadBtn.textContent) {
          const sizeMatch = downloadBtn.textContent.match(
            /\((\d+\.?\d*\s*[KMGT]?B)\)/i
          );
          if (sizeMatch) return sizeMatch[1];
        }

        const allText = document.body.innerText;
        const sizeMatch = allText.match(/(\d+\.?\d*)\s*(KB|MB|GB)/i);
        if (sizeMatch) return sizeMatch[0];

        return "Unknown";
      };

      const getDescription = () => {
        const element = document.querySelector(
          ".description p:not(.description-subheading)"
        );
        return element ? element.textContent?.trim() || "" : "";
      };

      const getUploadDate = () => {
        const uploadElement = Array.from(
          document.querySelectorAll(".details li")
        ).find((li) => li.textContent?.includes("Uploaded"));
        return uploadElement?.querySelector("span")?.textContent?.trim() || "";
      };

      const getFileType = () => {
        const element = document.querySelector(".filetype span:first-child");
        return element ? element.textContent?.trim() || "" : "";
      };

      const getCompatibility = () => {
        const compatSelect = document.getElementById(
          "compat-select"
        ) as HTMLSelectElement;
        if (compatSelect) {
          const selectedOption = compatSelect.options[compatSelect.selectedIndex];
          return selectedOption ? selectedOption.textContent?.trim() || "" : "";
        }
        return "";
      };

      const getDownloadLink = () => {
        const downloadBtn = document.querySelector(
          "#downloadButton, a.input.popsok, a[data-scrambled-url]"
        );

        if (downloadBtn && downloadBtn.getAttribute("data-scrambled-url")) {
          try {
            const scrambledUrl = downloadBtn.getAttribute("data-scrambled-url");
            return atob(scrambledUrl!);
          } catch (e) {
            console.log("Failed to decode scrambled URL:", e);
          }
        }

        const selectors = [
          "#downloadButton",
          "a.input.popsok",
          ".download_file_link",
          "a.gbtnprimary",
          'a[href*="download"]',
          'a[aria-label*="Download"]',
        ];

        for (const selector of selectors) {
          const element = document.querySelector(selector) as HTMLAnchorElement;
          if (element && element.href && !element.href.includes("javascript:")) {
            let href = element.href;
            if (href.startsWith("//")) {
              href = "https:" + href;
            } else if (href.startsWith("/")) {
              href = window.location.origin + href;
            }
            return href;
          }
        }

        return null;
      };

      return {
        name: getFileName(),
        size: getFileSize(),
        description: getDescription(),
        uploadDate: getUploadDate(),
        fileType: getFileType(),
        compatibility: getCompatibility(),
        link: getDownloadLink(),
      };
    });

    if (!fileInfo.link) {
      console.log("Attempting to trigger download button for scrambled URL...");

      try {
        await page.waitForSelector("#downloadButton", { timeout: 10000 });
        await page.click("#downloadButton");

        await page.waitForFunction(
          () => {
            const btn = document.querySelector("#downloadButton");
            return btn && btn.getAttribute("data-scrambled-url");
          },
          { timeout: 15000 }
        );

        const scrambledLink = await page.evaluate(() => {
          const downloadBtn = document.querySelector("#downloadButton");
          if (downloadBtn && downloadBtn.getAttribute("data-scrambled-url")) {
            try {
              const scrambledUrl = downloadBtn.getAttribute("data-scrambled-url");
              return atob(scrambledUrl!);
            } catch (e) {
              return null;
            }
          }
          return null;
        });

        if (scrambledLink) {
          fileInfo.link = scrambledLink;
        }
      } catch (e) {
        console.log("Failed to extract scrambled URL:", e);

        let interceptedUrl: string | null = null;

        page.on("request", (request) => {
          const reqUrl = request.url();
          if (
            reqUrl.includes("mediafire.com") &&
            (reqUrl.includes("download") ||
              reqUrl.match(/\.(zip|rar|exe|apk|pdf|mp4|mp3)$/i))
          ) {
            interceptedUrl = reqUrl;
          }
        });

        try {
          await page.click("#downloadButton");
          await page.waitForTimeout(5000);

          if (interceptedUrl) {
            fileInfo.link = interceptedUrl;
          }
        } catch (clickError) {
          console.log("Failed final fallback:", clickError);
        }
      }
    }

    const fileExtensionMatch = fileInfo.name?.match(/\.([a-zA-Z0-9]+)$/);
    const fileExtension = fileExtensionMatch
      ? fileExtensionMatch[1].toLowerCase()
      : "";

    const mimeTypeMap: { [key: string]: string } = {
      zip: "application/zip",
      rar: "application/x-rar-compressed",
      mp4: "video/mp4",
      mp3: "audio/mpeg",
      pdf: "application/pdf",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      txt: "text/plain",
      exe: "application/x-msdownload",
      apk: "application/vnd.android.package-archive",
    };

    const mimeType = mimeTypeMap[fileExtension] || "application/octet-stream";

    const metaTags = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("meta")).reduce(
        (acc: { [key: string]: string }, meta) => {
          const name = meta.getAttribute("name") || meta.getAttribute("property");
          const content = meta.getAttribute("content");
          if (name && content && name !== "undefined") {
            acc[name.split(":")[1] || name] = content;
          }
          return acc;
        },
        {}
      );
    });

    return {
      fileName: fileInfo.name,
      fileSize: fileInfo.size,
      description: fileInfo.description,
      uploadDate: fileInfo.uploadDate,
      fileType: fileInfo.fileType,
      compatibility: fileInfo.compatibility,
      downloadLink: fileInfo.link,
      mimeType,
      fileExtension,
      meta: metaTags,
    };
  } catch (error: any) {
    console.error("Scraping Error:", error.message);
    throw new Error(`Failed to scrape MediaFire: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export default async function mediafireHandler(req: Request, res: Response) {
  const url = (req.query.url as string) || (req.body.url as string);

  if (!url) {
    return res.status(400).json({ status: false, message: "Parameter 'url' is required" });
  }

  if (!url.includes("mediafire.com")) {
    return res.status(400).json({ status: false, message: "URL must be a MediaFire link" });
  }

  try {
    const result = await mediafireScrape(url);
    res.json({ status: true, data: result });
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message });
  }
}
