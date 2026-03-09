import { Request, Response } from 'express';
import axios from 'axios';
import { createCanvas, loadImage } from 'canvas';

// Fungsi helper untuk wrap text
function wrapTextCenter(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
    let line = '';
    for (let i = 0; i < text.length; i++) {
        let testLine = line + text[i];
        let testWidth = ctx.measureText(testLine).width;
        if (testWidth > maxWidth && line !== '') {
            ctx.fillText(line, x, y);
            line = text[i];
            y += lineHeight;
        } else {
            line = testLine;
        }
    }
    if (line) ctx.fillText(line, x, y);
}

export default async function canvasHandler(req: Request, res: Response) {
    // Ambil parameter terpisah
    const nickname = (req.query.nickname || req.body.nickname) as string;
    const text = (req.query.text || req.body.text) as string;
    const ppUrl = (req.query.pp || 'https://telegra.ph/file/a059a6a734ed202c879d3.jpg') as string;

    // Validasi parameter wajib
    if (!nickname || !text) {
        return res.status(400).json({
            status: false,
            message: "Parameter 'nickname' dan 'text' diperlukan."
        });
    }

    try {
        // 1. Load Images
        const bgUrl = 'https://files.catbox.moe/3gwr1l.jpg';
        const bg = await loadImage(bgUrl);
        const pp = await loadImage(ppUrl);

        // 2. Setup Canvas
        const canvas = createCanvas(720, 1280);
        const ctx = canvas.getContext('2d');

        // 3. Draw Background
        ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

        // 4. Draw Profile Picture (Circular)
        const ppX = 40;
        const ppY = 250;
        const ppSize = 70;
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(ppX + ppSize / 2, ppY + ppSize / 2, ppSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(pp, ppX, ppY, ppSize, ppSize);
        ctx.restore();

        // 5. Draw Username
        ctx.font = '28px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const usernameX = ppX + ppSize + 15;
        const usernameY = ppY + ppSize / 2;
        ctx.fillText(nickname, usernameX, usernameY);

        // 6. Draw Caption (Centered & Wrapped)
        ctx.font = 'bold 30px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const captionX = canvas.width / 2;
        const captionY = canvas.height - 650;
        const maxWidth = canvas.width - 100;
        const lineHeight = 42;
        
        wrapTextCenter(ctx, text, captionX, captionY, maxWidth, lineHeight);

        // 7. Convert to Buffer & Send
        const buffer = canvas.toBuffer('image/png');
        
        res.set('Content-Type', 'image/png');
        res.send(buffer);

    } catch (error: any) {
        console.error(error);
        res.status(500).json({ status: false, message: error.message });
    }
}
