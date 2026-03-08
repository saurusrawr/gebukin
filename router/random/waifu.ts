import { Request, Response } from 'express';

export default async function waifuHandler(req: Request, res: Response) {
    try {
        const apiResponse = await fetch("https://api.waifu.pics/sfw/waifu");
        if (!apiResponse.ok) throw new Error("Gagal mengambil data");
        
        const json: any = await apiResponse.json();
        
        const imageResponse = await fetch(json.url);
        const arrayBuffer = await imageResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        res.set('Content-Type', 'image/png');
        res.send(buffer);

    } catch (error: any) {
        console.error("Error waifu:", error);
        res.status(500).json({ status: false, message: "Internal Server Error" });
    }
};
