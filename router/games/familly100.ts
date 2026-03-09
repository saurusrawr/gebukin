import { Request, Response } from 'express';
import axios from 'axios';

export default async function family100Handler(req: Request, res: Response) {
    try {
        const response = await axios.get(
            'https://raw.githubusercontent.com/BochilTeam/database/master/games/family100.json',
            {
                timeout: 30000,
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
                }
            }
        );

        const data = response.data;

        if (!Array.isArray(data) || data.length === 0) {
            return res.status(500).json({
                status: false,
                message: "Data tidak ditemukan"
            });
        }

        const random = data[Math.floor(Math.random() * data.length)];

        res.json({
            status: true,
            result: {
                question: random.soal,
                answers: random.jawaban,
                total_answer: random.jawaban.length
            }
        });

    } catch (error: any) {
        console.error("FAMILY100 ERROR:", error.message);

        res.status(500).json({
            status: false,
            message: error.message || "Internal Server Error"
        });
    }
}
