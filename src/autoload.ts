/*
  Saurus For You 💌
*/
import { Application, Request, Response, NextFunction } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { logRouterRequest } from './logger';

let regRouter = new Set<string>();
let currentConfig: any = null;
let appInstance: Application;

/* =======================
   MAINTENANCE CHECKER
======================= */

const MAINTENANCE_URL = "https://raw.githubusercontent.com/saurusrawr/saurusdb/refs/heads/main/database-api.txt";

let maintenanceCache = {
    status: "on",
    lastCheck: 0
};

async function checkMaintenance(): Promise<string> {
    const now = Date.now();

    if (now - maintenanceCache.lastCheck < 10000) {
        return maintenanceCache.status;
    }

    try {
        const { data } = await axios.get(MAINTENANCE_URL, {
            timeout: 5000,
            headers: {
                "User-Agent": "Mozilla/5.0"
            }
        });

        const status = String(data).trim().toLowerCase();

        maintenanceCache = {
            status,
            lastCheck: now
        };

        return status;

    } catch (err) {
        console.error("[Maintenance Check Failed]");
        return "on";
    }
}

/* =======================
   AUTO LOAD SYSTEM
======================= */

export const initAutoLoad = (app: Application, config: any, configPath: string) => {
    appInstance = app;
    currentConfig = config;

    console.log('[✓] Auto Load Activated');

    if (fs.existsSync(configPath)) {
        fs.watch(configPath, (eventType, filename) => {
            if (filename && eventType === 'change') {
                console.log(`Config file changed: ${filename}`);
                try {
                    const newConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                    currentConfig = newConfig;
                    console.log('[✓] Config reloaded successfully');
                    reloadRouter();
                } catch (error) {
                    console.error('[ㄨ] Failed to reload config:', error);
                }
            }
        });
    }

    const routerDir = path.join(process.cwd(), 'router');
    if (fs.existsSync(routerDir)) {
        console.log(`[i] Watching router directory: ${routerDir}`);
        fs.watch(routerDir, { recursive: true }, (eventType, filename) => {
            if (filename && (filename.endsWith('.ts') || filename.endsWith('.js'))) {
                console.log(`[✓] Route file changed: ${filename}`);

                const fullPath = path.join(routerDir, filename);

                if (require.cache[fullPath]) {
                    delete require.cache[fullPath];
                }

                console.log(`Route cache cleared for: ${filename}`);
                reloadSingleRoute(filename);
            }
        });
    } else {
        console.warn(`[!] Router directory not found at: ${routerDir}`);
    }
};

const reloadSingleRoute = (filename: string) => {
    const normalized = filename.split(path.sep).join('/');
    const parts = normalized.split('/');

    const category = parts.length > 1 ? parts[parts.length - 2] : null;
    const fileNameWithExt = parts[parts.length - 1];
    const routeName = fileNameWithExt.replace(/\.(ts|js)$/, '');

    if (category && currentConfig?.tags?.[category]) {
        const route = currentConfig.tags[category].find((r: any) => r.filename === routeName);
        if (route) {
            const routeKey = `${route.method}:${route.endpoint}`;
            regRouter.delete(routeKey);
            registerRoute(route, category);
        }
    }
};

const reloadRouter = () => {
    console.log('Reloading all routes...');
    regRouter.clear();
    loadRouter(appInstance, currentConfig);
};

export const loadRouter = (app: Application, config: any) => {
    const tags = config.tags;
    const creatorName = config.settings.creator;

    if (!tags) {
        console.error("[!] Error: 'tags' not found in config.json");
        return;
    }

    Object.keys(tags).forEach((category) => {
        const routes = tags[category];
        routes.forEach((route: any) => {
            registerRoute(route, category, creatorName, app);
        });
    });
};

const registerRoute = (route: any, category: string, creatorName?: string, app?: Application) => {

    const targetApp = app || appInstance;
    const targetCreator = creatorName || currentConfig?.settings?.creator;

    if (!targetApp || !targetCreator) return;

    const routeKey = `${route.method}:${route.endpoint}`;

    if (regRouter.has(routeKey)) {
        return;
    }

    const possibleBaseDirs = [
        path.join(__dirname, '..', 'router', category),
        path.join(process.cwd(), 'router', category),
        path.join(process.cwd(), 'dist', 'router', category)
    ];

    const extensions = ['.ts', '.js'];
    let modulePath = '';

    outerLoop:
    for (const dir of possibleBaseDirs) {
        for (const ext of extensions) {
            const attemptPath = path.join(dir, `${route.filename}${ext}`);
            if (fs.existsSync(attemptPath)) {
                modulePath = attemptPath;
                break outerLoop;
            }
        }
    }

    if (modulePath) {
        try {

            try {
                delete require.cache[require.resolve(modulePath)];
            } catch (e) {}

            const handlerModule = require(modulePath);
            const handler = handlerModule.default || handlerModule;

            if (typeof handler === 'function') {

                const wrappedHandler = async (req: Request, res: Response, next: NextFunction) => {

                    const maintenanceStatus = await checkMaintenance();

                    if (maintenanceStatus === "off") {
                        return res.status(503).json({
                            creator: "Saurus",
                            status: false,
                            message: "🔧 API sedang dalam maintenance. Silakan coba beberapa saat lagi."
                        });
                    }

                    logRouterRequest(req, res);

                    const originalJson = res.json;
                    res.json = function (body) {

                        if (body && typeof body === 'object' && !Array.isArray(body)) {
                            const modifiedBody = {
                                creator: targetCreator,
                                ...body
                            };
                            return originalJson.call(this, modifiedBody);
                        }

                        return originalJson.call(this, body);
                    };

                    try {
                        await handler(req, res, next);
                    } catch (err) {
                        console.error(`Error in route ${route.endpoint}:`, err);
                        res.status(500).json({
                            error: 'Internal Server Error',
                            message: err instanceof Error ? err.message : String(err)
                        });
                    }
                };

                if (route.method === 'GET') targetApp.get(route.endpoint, wrappedHandler);
                else if (route.method === 'POST') targetApp.post(route.endpoint, wrappedHandler);

                regRouter.add(routeKey);

                console.log(`[✓] LOADED: ${route.method} ${route.endpoint} -> ${path.basename(modulePath)}`);

            } else {
                console.error(`[ㄨ] Invalid handler type in ${modulePath}. Expected function, got ${typeof handler}`);
            }

        } catch (error) {
            console.error(`[ㄨ] Failed to load route ${route.endpoint} from ${modulePath}:`, error);
        }

    } else {
        console.error(`[!] FILE NOT FOUND: router/${category}/${route.filename}.ts`);
    }
};
