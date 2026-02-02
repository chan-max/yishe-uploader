import { createServer } from 'http';
import { createReadStream } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { URL } from 'url';
import { spawn } from 'child_process';
import http from 'http';
import { BrowserService } from '../src/services/BrowserService.js';

// 如需访问自签名 HTTPS 可开启；浏览器连接管理本身不依赖它
if (process.env.DISABLE_TLS_VERIFY === 'true') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    console.warn('⚠️  TLS 证书验证已禁用');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const WEB_DIR = path.join(ROOT_DIR, 'web');

const DEFAULT_PORT = Number(process.env.PORT) || 7010;

function openBrowser(url) {
    const platform = process.platform;
    let command;
    if (platform === 'darwin') {
        command = ['open', url];
    } else if (platform === 'win32') {
        command = ['cmd', '/c', 'start', '""', url];
    } else {
        command = ['xdg-open', url];
    }
    const child = spawn(command[0], command.slice(1), { stdio: 'ignore', detached: true });
    child.unref();
}

function sendJSON(res, statusCode, payload) {
    const body = JSON.stringify(payload);
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body)
    });
    res.end(body);
}

function serveStatic(res, filePath, contentType = 'text/plain; charset=utf-8') {
    const stream = createReadStream(filePath);
    stream.on('open', () => {
        res.writeHead(200, { 'Content-Type': contentType });
        stream.pipe(res);
    });
    stream.on('error', () => {
        res.writeHead(404);
        res.end('Not Found');
    });
}

async function handleBrowserStatus(req, res) {
    try {
        const status = await BrowserService.getStatus();
        sendJSON(res, 200, { success: true, data: status });
    } catch (e) {
        sendJSON(res, 500, { success: false, message: e?.message || '获取浏览器状态失败' });
    }
}

async function handleBrowserConnect(req, res) {
    try {
        const body = await readRequestBody(req);
        const {
            mode,
            chromeUserDataDir,
            chromeProfileDir,
            chromeExecutablePath,
            cdpEndpoint
        } = JSON.parse(body || '{}');

        // 触发连接/启动（BrowserService 内部会复用已有实例）
        await BrowserService.getOrCreateBrowser({
            mode,
            chromeUserDataDir,
            chromeProfileDir,
            chromeExecutablePath,
            cdpEndpoint
        });

        const status = await BrowserService.getStatus();
        sendJSON(res, 200, { success: true, data: status });
    } catch (e) {
        sendJSON(res, 500, { success: false, message: e?.message || '连接浏览器失败' });
    }
}

async function handleBrowserClose(req, res) {
    try {
        await BrowserService.close();
        const status = await BrowserService.getStatus();
        sendJSON(res, 200, { success: true, data: status });
    } catch (e) {
        sendJSON(res, 500, { success: false, message: e?.message || '关闭浏览器失败' });
    }
}

/**
 * 检测指定端口是否有 Chrome 远程调试服务在监听
 * 请求 http://127.0.0.1:port/json/version，Chrome 开启调试时会返回版本信息
 */
async function handleBrowserCheckPort(req, res) {
    try {
        const body = await readRequestBody(req);
        const { port = 9222 } = JSON.parse(body || '{}');
        const url = `http://127.0.0.1:${port}/json/version`;
        const result = await new Promise((resolve) => {
            const req = http.get(url, { timeout: 3000 }, (resp) => {
                let data = '';
                resp.on('data', chunk => { data += chunk; });
                resp.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        resolve({
                            ok: true,
                            port,
                            browser: json.Browser || json.browser,
                            'Protocol-Version': json['Protocol-Version'],
                            'User-Agent': json['User-Agent']
                        });
                    } catch {
                        resolve({ ok: true, port, raw: data?.slice(0, 200) });
                    }
                });
            });
            req.on('error', (e) => resolve({ ok: false, port, error: e.message }));
            req.on('timeout', () => { req.destroy(); resolve({ ok: false, port, error: '连接超时' }); });
        });
        sendJSON(res, 200, { success: true, data: result });
    } catch (e) {
        sendJSON(res, 500, { success: false, message: e?.message || '检测端口失败' });
    }
}

/**
 * 启动带远程调试端口的 Chrome（使用默认 profile，含你的登录态）
 * 流程：先完全关闭 Chrome → 点此接口 → Chrome 以调试模式启动 → 再用 CDP 连接
 */
async function handleBrowserLaunchWithDebug(req, res) {
    try {
        const body = await readRequestBody(req);
        const { port = 9222, userDataDir } = JSON.parse(body || '{}');
        const result = BrowserService.launchWithDebugPort({ port, userDataDir });
        sendJSON(res, 200, { success: true, data: result });
    } catch (e) {
        sendJSON(res, 500, { success: false, message: e?.message || '启动浏览器失败' });
    }
}

function readRequestBody(req) {
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', chunk => {
            data += chunk;
            if (data.length > 1e6) {
                req.destroy();
                reject(new Error('请求体过大'));
            }
        });
        req.on('end', () => resolve(data));
        req.on('error', reject);
    });
}

function getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case '.html': return 'text/html; charset=utf-8';
        case '.css': return 'text/css; charset=utf-8';
        case '.js': return 'text/javascript; charset=utf-8';
        case '.png': return 'image/png';
        case '.jpg':
        case '.jpeg': return 'image/jpeg';
        case '.svg': return 'image/svg+xml';
        case '.json': return 'application/json; charset=utf-8';
        default: return 'text/plain; charset=utf-8';
    }
}

const server = createServer(async (req, res) => {
    try {
        const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
        const pathname = parsedUrl.pathname;

        if (pathname.startsWith('/api/')) {
            if (req.method === 'GET' && pathname === '/api/browser/status') {
                await handleBrowserStatus(req, res);
                return;
            }
            if (req.method === 'POST' && pathname === '/api/browser/connect') {
                await handleBrowserConnect(req, res);
                return;
            }
            if (req.method === 'POST' && pathname === '/api/browser/close') {
                await handleBrowserClose(req, res);
                return;
            }
            if (req.method === 'POST' && pathname === '/api/browser/launch-with-debug') {
                await handleBrowserLaunchWithDebug(req, res);
                return;
            }
            if (req.method === 'POST' && pathname === '/api/browser/check-port') {
                await handleBrowserCheckPort(req, res);
                return;
            }

            sendJSON(res, 404, { success: false, message: 'API 路径不存在' });
            return;
        }

        // 静态资源处理
        let filePath = pathname === '/' ? path.join(WEB_DIR, 'index.html') : path.join(WEB_DIR, pathname);
        // 防止目录穿越
        if (!filePath.startsWith(WEB_DIR)) {
            res.writeHead(403);
            res.end('Forbidden');
            return;
        }

        try {
            const contentType = getContentType(filePath);
            serveStatic(res, filePath, contentType);
        } catch {
            res.writeHead(404);
            res.end('Not Found');
        }
    } catch (error) {
        sendJSON(res, 500, { success: false, message: error.message || '服务器错误' });
    }
});

server.listen(DEFAULT_PORT, () => {
    const url = `http://localhost:${DEFAULT_PORT}`;
    console.log(`🚀 Web server is running at ${url}`);
    openBrowser(url);
});
