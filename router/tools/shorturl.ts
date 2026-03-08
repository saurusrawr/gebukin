import { Request, Response } from 'express';
import axios from 'axios';

export default async function shortUrlHandler(req: Request, res: Response) {
    const url = (req.query.url || req.body.url) as string;
    const alias = (req.query.alias || req.body.alias) as string || '';

    if (!url) {
        return res.status(400).json({
            status: false,
            message: "Parameter 'url' diperlukan."
        });
    }

    if (!url.startsWith("http")) {
        return res.status(400).json({
            status: false,
            message: "URL harus diawali dengan http:// atau https://"
        });
    }

    try {
        const apiUrl = `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}&alias=${alias}`;
        const response = await axios.get(apiUrl);
        
        if (response.data === "Error") {
            throw new Error("Custom Alias ini sudah dipakai orang lain. Coba nama lain.");
        }
        
        res.json({
            status: true,
            result: response.data
        });

    } catch (error: any) {
        if (error.response && error.response.status === 400) {
             return res.status(400).json({ status: false, message: "Alias tidak tersedia." });
        }
        res.status(500).json({ status: false, message: error.message });
    }
}
