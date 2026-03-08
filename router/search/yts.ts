import { Request, Response } from 'express';
import axios from 'axios';

export default async function ytsHandler(req: Request, res: Response) {
    const query = (req.query.q || req.query.query) as string;

    if (!query) {
        return res.status(400).json({
            status: false,
            message: "Parameter 'q' diperlukan."
        });
    }

    try {
        const { data } = await axios.get("https://www.youtube.com/results", {
            params: { search_query: query },
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
        });

        const match = data.match(/var ytInitialData = (.*?);<\/script>/s);
        if (!match) throw new Error("Gagal parsing data Youtube.");

        const ytInitialData = JSON.parse(match[1]);
        const contents = ytInitialData.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;

        if (!contents) throw new Error("Konten tidak ditemukan.");

        const section = contents.find((c: any) => c.itemSectionRenderer)?.itemSectionRenderer?.contents;

        if (!section) throw new Error("Section tidak ditemukan.");

        const results = section
            .filter((i: any) => i.videoRenderer && i.videoRenderer.lengthText)
            .map((i: any) => {
                const v = i.videoRenderer;
                return {
                    title: v.title?.runs?.[0]?.text || "No Title",
                    thumbnail: v.thumbnail?.thumbnails?.slice(-1)[0]?.url || "",
                    duration: v.lengthText?.simpleText || "0:00",
                    uploaded: v.publishedTimeText?.simpleText || "",
                    views: v.viewCountText?.simpleText || "0 views",
                    url: `https://youtu.be/${v.videoId}`,
                    videoId: v.videoId
                };
            });

        res.json({
            status: true,
            result: results
        });

    } catch (error: any) {
        res.status(500).json({ status: false, message: error.message });
    }
}
