import { Request, Response } from 'express';
import axios from 'axios';
// @ts-ignore
import { CookieJar } from 'tough-cookie'; 
import * as cheerio from 'cheerio';
import FormData from 'form-data';
import { wrapper } from 'axios-cookiejar-support';

class SnapTikClient {
    private jar: CookieJar;
    private client: any;

    constructor() {
        this.jar = new CookieJar();
        this.client = wrapper(axios.create({
            baseURL: "https://snaptik.app",
            jar: this.jar,
            withCredentials: true,
            headers: {
                "User-Agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36",
                "Upgrade-Insecure-Requests": "1",
            },
            timeout: 30000,
        }));
    }

    private async getToken(): Promise<string> {
        const { data } = await this.client.get("/en2", {
            headers: { Referer: "https://snaptik.app/en2" },
        });
        const $ = cheerio.load(data);
        return $('input[name="token"]').val() as string;
    }

    private async getScript(url: string): Promise<string> {
        const token = await this.getToken();
        if (!token) throw new Error("Gagal mengambil token dari SnapTik.");

        const form = new FormData();
        form.append("url", url);
        form.append("lang", "en2");
        form.append("token", token);

        const { data } = await this.client.post("/abc2.php", form, {
            headers: {
                ...form.getHeaders(),
                referer: "https://snaptik.app/en2",
                origin: "https://snaptik.app",
            },
        });

        return data;
    }

    private async evalScript(script1: string): Promise<{ html: string }> {
        const script2 = await new Promise<string>((resolve) =>
            // @ts-ignore
            Function("eval", script1)(resolve)
        );

        return new Promise((resolve, reject) => {
            let html = "";
            const mocks = {
                $: () => ({
                    remove() { },
                    style: { display: "" },
                    get innerHTML() { return html; },
                    set innerHTML(v: string) { html = v; },
                }),
                app: { showAlert: reject },
                document: { getElementById: () => ({ src: "" }) },
                fetch: (url: string) => {
                    resolve({ html });
                    return { json: async () => ({}) };
                },
                XMLHttpRequest: function () {
                    return { open() { }, send() { } };
                },
                window: { location: { hostname: "snaptik.app" } },
                gtag() { },
                Math,
            };

            try {
                // @ts-ignore
                Function(...Object.keys(mocks), script2)(...Object.values(mocks));
            } catch (e) {
                reject(e);
            }
        });
    }

    private async parseHtml(html: string) {
        const $ = cheerio.load(html);
        const title = $(".video-title").text().trim() || "No Title";
        const author = $(".info span").text().trim() || "Unknown";
        const thumbnail = $(".avatar").attr("src") || $("#thumbnail").attr("src") || null;
        
        const links = $("div.video-links a")
            .map((_, el) => $(el).attr("href"))
            .get()
            .filter(Boolean);

        if (!links.length) throw new Error("Video tidak ditemukan.");

        return {
            title,
            author,
            thumbnail,
            links: [...new Set(links)],
        };
    }

    public async process(url: string) {
        try {
            const script = await this.getScript(url);
            const { html } = await this.evalScript(script);
            return await this.parseHtml(html);
        } catch (e: any) {
            throw new Error(e.message);
        }
    }
}

export default async function tiktokHandler(req: Request, res: Response) {
    const url = (req.query.url || req.body.url) as string;

    if (!url) return res.status(400).json({ status: false, message: "URL required" });

    try {
        const client = new SnapTikClient();
        const result = await client.process(url);
        res.json({ status: true, data: result });
    } catch (error: any) {
        res.status(500).json({ status: false, message: error.message });
    }
}
