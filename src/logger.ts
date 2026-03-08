/*
  Saurus For You 💌
*/
import { Request, Response } from 'express';

export const logRouterRequest = (req: Request, res: Response) => {
    res.on('finish', () => {
        let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
        if (Array.isArray(ip)) {
            ip = ip[0];
        } else if (typeof ip === 'string' && ip.includes(',')) {
            ip = ip.split(',')[0].trim();
        }
        if (typeof ip === 'string' && ip.includes('::ffff:')) {
            ip = ip.replace('::ffff:', '');
        }
        const status = res.statusCode;
        const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
        const color = status >= 500 ? '\x1b[31m' : 
                      status >= 400 ? '\x1b[33m' : 
                      status >= 300 ? '\x1b[36m' : 
                      status >= 200 ? '\x1b[32m' : 
                      '\x1b[0m';
        const reset = '\x1b[0m';
        console.log(`[${ip}] = ${color}[${status}]${reset} ${fullUrl}`);
    });
};
