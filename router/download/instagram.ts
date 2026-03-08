import { Request, Response } from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

export default async function instagramHandler(req: Request, res: Response) {
    const url = (req.query.url || req.body.url) as string;

    if (!url) {
        return res.status(400).json({
            status: false,
            message: "Parameter 'url' diperlukan."
        });
    }

    try {
        const data = new URLSearchParams();
        data.append('url', url);
        data.append('v', '3');
        data.append('lang', 'en');

        const config = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Android 10; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0',
                'Content-Type': 'application/x-www-form-urlencoded',
                'accept-language': 'id-ID',
                'referer': 'https://downloadgram.org/',
                'origin': 'https://downloadgram.org',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-site',
                'priority': 'u=0',
                'te': 'trailers'
            }
        };

        const response = await axios.post('https://api.downloadgram.org/media', data, config);
        const $ = cheerio.load(response.data);

        let result: any = {};

        if ($('video').length) {
            result.type = 'video';
            result.url = $('video source').attr('src');
            result.download_url = $('a[download]').attr('href');
            result.thumbnail = $('video').attr('poster');
        } else if ($('img').length) {
            result.type = 'image';
            result.url = $('img').attr('src');
            result.download_url = $('a[download]').attr('href');
        } else {
            throw new Error("Media tidak ditemukan. Pastikan akun tidak diprivate.");
        }
        for (let key in result) {
            if (Object.prototype.hasOwnProperty.call(result, key) && result[key]) {
                result[key] = result[key].replace(/\\\\"/g, '').replace(/\\"/g, '');
            }
        }

        res.json({
            status: true,
            result: result
        });

    } catch (error: any) {
        res.status(500).json({ status: false, message: error.message });
    }
}
