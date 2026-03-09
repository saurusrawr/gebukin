/*
  Saurusszz For You 💌
*/
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { loadRouter, initAutoLoad } from './src/autoload';
const app: Application = express();
const PORT = process.env.PORT || 3000;
app.set('trust proxy', true);
const configNya = [
    path.join(__dirname, 'src', 'config.json'),
    path.join(__dirname, '..', 'src', 'config.json'),
    path.join(process.cwd(), 'src', 'config.json'),
    path.join('/var/task/src/config.json')
];
let configPath = '';
for (const p of configNya) {
    if (fs.existsSync(p)) {
        configPath = p;
        break;
    }
}
if (!configPath) {
    console.error('[✗] Config file not found');
    process.exit(1);
}
let config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
const visitor_db = path.join('/tmp', 'visitors.json');
const recentRequests: string[] = [];

const visit = (): number => {
    try {
        if (fs.existsSync(visitor_db)) {
            const data = fs.readFileSync(visitor_db, 'utf-8');
            return JSON.parse(data).count;
        }
        return parseInt(config.settings.visitors || "0");
    } catch (error) { 
        return 0; 
    }
};
const incrementVisitor = (): void => {
    try {
        let count = visit();
        count++;
        fs.writeFileSync(visitor_db, JSON.stringify({ count }));
    } catch (error) {}
};
const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
};
const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${d}d ${h}h ${m}m ${s}s`;
};
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req: Request, res: Response, next: NextFunction) => {
    res.on('finish', () => {
        const ignored = ['/stats', '/stats/data', '/src', '/docs', '/config', '/favicon.ico', '/'];
        const isIgnored = ignored.some(p => req.path.startsWith(p) || req.path === '/');
        if (!isIgnored) {
            const method = req.method;
            const status = res.statusCode;
            const host = req.get('host');
            const protocol = req.protocol; 
            let cleanUrl = req.originalUrl.replace(/(=)[^&]+/g, '$1');
            const fullUrl = `${protocol}://${host}${cleanUrl}`;
            const logLine = `[${method}] [${status}] ${fullUrl}`;
            recentRequests.push(logLine);
            if (recentRequests.length > 50) recentRequests.shift();
        }
    });
    next();
});
app.use(express.static(path.join(process.cwd(), 'public')));
app.use('/src', express.static(path.join(process.cwd(), 'src')));
loadRouter(app, config);
app.get('/stats/data', (req: Request, res: Response) => {
    try {
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const cpus = os.cpus();    
        res.json({
            status: true,
            server: {
                platform: os.platform(),
                arch: os.arch(),
                hostname: os.hostname(),
                uptime: formatUptime(os.uptime()),
                node_version: process.version,
                memory: {
                    total: formatBytes(totalMem),
                    used: formatBytes(usedMem),
                    free: formatBytes(freeMem),
                    percent: Math.round((usedMem / totalMem) * 100)
                },
                cpu: {
                    model: cpus[0].model,
                    speed: `${cpus[0].speed} MHz`,
                    cores: cpus.length,
                    load: os.loadavg()[0].toFixed(2)
                }
            },
            requests: recentRequests
        });
    } catch (e) {
        res.status(500).json({ status: false });
    }
});
app.get('/stats', (req: Request, res: Response) => {
    res.sendFile(path.join(process.cwd(), 'public', 'stats.html'));
});
app.get('/config', (req: Request, res: Response) => {
    try {
        const currentConfig = JSON.parse(JSON.stringify(config));
        currentConfig.settings.visitors = visit().toString();
        res.json({ creator: config.settings.creator, ...currentConfig });
    } catch (error) { res.status(500).json({ creator: config.settings.creator, error: "Internal Server Error" }); }
});
app.get('/', (req: Request, res: Response) => {
    incrementVisitor();
    res.sendFile(path.join(process.cwd(), 'public', 'landing.html'));
});
app.get('/docs', (req: Request, res: Response) => { res.sendFile(path.join(process.cwd(), 'public', 'docs.html')); });
app.use((req: Request, res: Response) => {
    if (req.accepts('html')) {
        const possible404 = [path.join(process.cwd(), 'public', '404.html'), path.join(__dirname, 'public', '404.html')];
        for (const p of possible404) { if (fs.existsSync(p)) return res.status(404).sendFile(p); }
    }
    res.status(404).json({ status: false, creator: config.settings.creator, message: "Route not found" });
});
initAutoLoad(app, config, configPath);
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
export default app;
