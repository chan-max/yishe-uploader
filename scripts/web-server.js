import { createServer } from 'http';
import { createReadStream } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { URL } from 'url';
import { spawn } from 'child_process';
import axios from 'axios';
import { PublishService } from '../src/services/PublishService.js';
import { BrowserService } from '../src/services/BrowserService.js';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
console.warn('⚠️  TLS 证书验证已禁用');

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

async function fetchPendingFromServer(baseUrl, status) {
    const body = {
        publishStatus: status,
        includeRelations: false,
        page: 1,
        pageSize: 1000
    };
    console.log('[pending] requesting %s status=%s body=%o', baseUrl, status, body);
    const response = await axios.post(`${baseUrl}/api/product/page`, body, { timeout: 30000 });
    return response.data || {};
}

async function handleGetPending(req, res, query) {
    const env = query.env === 'dev' ? 'dev' : 'prod';
    const baseUrl = env === 'dev' ? 'http://localhost:1520' : 'https://1s.design:1520';
    const statusCandidates = ['pending_social_media', 'pendingSocialMedia', 'pending'];

    try {
        let resBody = null;
        let selectedStatus = null;

        for (const candidate of statusCandidates) {
            try {
                const data = await fetchPendingFromServer(baseUrl, candidate);
                console.log(data)
                const list = extractList(data);
                console.log('[pending] status %s -> %d items', candidate, list.length);
                if (list.length > 0 || candidate === statusCandidates[statusCandidates.length - 1]) {
                    resBody = data;
                    selectedStatus = candidate;
                    break;
                }
            } catch (err) {
                console.error('[pending] status %s request failed: %s', candidate, err?.message || err);
                if (candidate === statusCandidates[statusCandidates.length - 1]) {
                    throw err;
                }
            }
        }

        const list = extractList(resBody);
        console.log('[pending] final status=%s, count=%d', selectedStatus, list.length);

        if (!res.writableEnded) {
            sendJSON(res, 200, {
                success: true,
                data: list.map(item => ({
                    id: item.id,
                    name: item.name,
                    description: item.description || '',
                    images: Array.isArray(item.images) ? item.images : [],
                    keywords: item.keywords || '',
                    publishStatus: item.publishStatus
                })),
                rawCount: list.length,
                statusTried: selectedStatus
            });
        }
    } catch (error) {
        console.error('[pending] request failed:', error?.message || error);
        if (!res.writableEnded) {
            sendJSON(res, 500, {
                success: false,
                message: error.message || '获取待发布数据失败'
            });
        }
    }
}

function extractList(resBody) {
    if (!resBody) return [];
    return Array.isArray(resBody?.data?.list)
        ? resBody.data.list
        : Array.isArray(resBody?.data?.data?.list)
            ? resBody.data.data.list
            : Array.isArray(resBody?.list)
                ? resBody.list
                : Array.isArray(resBody?.data)
                    ? resBody.data
                    : [];
}

function runPublishCommand({ env, productId, productCode }) {
    return new Promise((resolve) => {
        const args = [path.join(__dirname, 'publish-single-product.js'), env || 'prod'];
        if (productId) {
            args.push(productId);
        } else {
            args.push('');
        }
        if (productCode) {
            args.push(productCode);
        }

        const child = spawn('node', args, { cwd: ROOT_DIR, shell: false });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', chunk => { stdout += chunk.toString(); });
        child.stderr.on('data', chunk => { stderr += chunk.toString(); });

        child.on('error', error => {
            resolve({ success: false, message: error.message, stdout, stderr });
        });

        child.on('close', code => {
            resolve({
                success: code === 0,
                code,
                stdout,
                stderr
            });
        });
    });
}

async function handlePublish(req, res) {
    try {
        const body = await readRequestBody(req);
        const { env = 'prod', productId = '', productCode = '' } = JSON.parse(body || '{}');

        if (!productId && !productCode) {
            sendJSON(res, 400, { success: false, message: '缺少 productId 或 productCode' });
            return;
        }

        const result = await runPublishCommand({ env, productId, productCode });

        const message = result.success ? '发布流程已完成' : '发布流程失败';
        sendJSON(res, 200, {
            success: result.success,
            message,
            stdout: result.stdout,
            stderr: result.stderr
        });
    } catch (error) {
        sendJSON(res, 500, { success: false, message: error.message || '发布失败' });
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
            if (req.method === 'POST' && pathname === '/api/check-login') {
                try {
                    const body = await readRequestBody(req);
                    const { force = false } = JSON.parse(body || '{}');
                    const loginStatus = await PublishService.checkSocialMediaLoginStatus(force);
                    sendJSON(res, 200, { success: true, data: loginStatus });
                } catch (e) {
                    sendJSON(res, 500, { success: false, message: e?.message || '检查登录状态失败' });
                }
                return;
            }
            if (req.method === 'GET' && pathname === '/api/pending') {
                await handleGetPending(req, res, Object.fromEntries(parsedUrl.searchParams.entries()));
                return;
            }
            if (req.method === 'POST' && pathname === '/api/publish') {
                await handlePublish(req, res);
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
