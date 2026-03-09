import { Request, Response } from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio'; // untuk parsing HTML

export default async function checkWebHandler(req: Request, res: Response) {
    const domain = (req.query.domain || req.body.domain) as string;

    if (!domain) return res.status(400).json({ status: false, message: "Parameter 'domain' wajib diisi." });

    try {
        // request ke downforeveryoneorjustme
        const url = `https://downforeveryoneorjustme.com/${domain}`;
        const { data: html } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        // parsing HTML untuk ambil status
        const $ = cheerio.load(html);
        let status = "Unknown";

        const bodyText = $('body').text();

        if (bodyText.includes("It's just you")) status = "UP ✅";
        if (bodyText.includes("It's not just you")) status = "DOWN ❌";

        return res.json({
            status: true,
            domain,
            websiteStatus: status
        });

    } catch (err: any) {
        return res.status(500).json({ status: false, message: err.message });
    }
}
