import { Request, Response } from 'express';
import axios from 'axios';

export default async function pinterestHandler(req: Request, res: Response) {
    const query = (req.query.q || req.query.query) as string;

    if (!query) {
        return res.status(400).json({
            status: false,
            message: "Parameter 'q' diperlukan."
        });
    }

    try {
        const url = `https://id.pinterest.com/resource/BaseSearchResource/get/?source_url=/search/pins/?q=${query}&rs=rs&data=${encodeURIComponent(JSON.stringify({
            options: {
                query: query,
                rs: "rs",
                scope: "pins",
                redux_normalize_feed: true,
                source_url: `/search/pins/?q=${encodeURIComponent(query)}&rs=rs`
            },
            context: {}
        }))}`;

        const response = await axios.get(url, {
            headers: {
                "accept": "application/json, text/javascript, */*; q=0.01",
                "x-pinterest-appstate": "active",
                "x-pinterest-pws-handler": "www/search/[scope].js",
                "x-requested-with": "XMLHttpRequest",
                "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36",
                "referer": "https://id.pinterest.com/",
                "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7"
            }
        });

        const data = response.data;
        const results = data.resource_response?.data?.results || [];

        if (results.length === 0) {
            return res.json({
                status: true,
                result: []
            });
        }

        const formatted = results.map((pin: any) => ({
            id: pin.id,
            title: pin.seo_alt_text || pin.title || "No Title",
            image: pin.images?.["474x"]?.url || pin.images?.["236x"]?.url || pin.images?.orig?.url || null,
            board: pin.board?.name || "-",
            username: pin.pinner?.username || "-",
            source: `https://id.pinterest.com/pin/${pin.id}/`
        })).filter((item: any) => item.image !== null);

        res.json({
            status: true,
            result: formatted
        });

    } catch (error: any) {
        res.status(500).json({ status: false, message: error.message });
    }
}
