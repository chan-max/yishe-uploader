/**
 * HTTP API 服务器
 * 提供 RESTful API 接口 + 前端静态文件（同一端口）
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { URL, fileURLToPath } from 'url';
import publishService from './publishService.js';
import { getBrowserStatus, getOrCreateBrowser, closeBrowser, launchWithDebugPort, checkAndReconnectBrowser, exportUserData, importUserData } from '../services/BrowserService.js';
import { PublishService } from '../services/PublishService.js';
import { logger } from '../utils/logger.js';
import { PLATFORM_CONFIGS } from '../config/platforms.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIR = process.env.FRONTEND_DIST
    ? path.resolve(process.env.FRONTEND_DIST)
    : path.resolve(__dirname, '../../web/dist');
const UPLOAD_DIR = path.resolve(__dirname, '../../temp');

/** 与前端一致的默认 CDP 独立配置目录（避免占用系统 Chrome profile） */
function getDefaultCdpUserDataDir() {
    const envDir = process.env.YISHE_AUTO_BROWSER_CDP_USER_DATA_DIR || process.env.UPLOADER_CDP_USER_DATA_DIR;
    if (envDir) {
        return envDir;
    }

    if (process.platform === 'win32') {
        return 'C:\\temp\\yishe-auto-browser-cdp-1s';
    }

    const homeDir = os.homedir();
    const safeBase = homeDir && typeof homeDir === 'string'
        ? homeDir
        : process.cwd();

    return path.resolve(safeBase, '.yishe-auto-browser', 'cdp-1s');
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * API服务器类
 */
const BROWSER_CHECK_INTERVAL_MS = Number(process.env.BROWSER_CHECK_INTERVAL_MS) || 10000;

class ApiServer {
    constructor(port = 7010) {
        this.port = port;
        this.server = null;
        this.browserCheckTimer = null;
    }

    /**
     * 启动服务器
     */
    start() {
        this.server = http.createServer(async (req, res) => {
            await this.handleRequest(req, res);
        });

        this.server.listen(this.port, () => {
            logger.info(`服务已启动，端口: ${this.port}`);
            logger.info(`访问地址: http://localhost:${this.port}`);
            this.startBrowserCheckTimer();
        });

        return this.server;
    }

    /** 定时检测浏览器实例（断开则清除引用，便于下次发布时自动重连） */
    startBrowserCheckTimer() {
        if (this.browserCheckTimer) return;
        this.browserCheckTimer = setInterval(async () => {
            try {
                const result = await checkAndReconnectBrowser({ reconnect: false });
                if (!result.available && result.message && !result.message.includes('无浏览器实例')) {
                    logger.debug('定时检测: 浏览器已断开，引用已清除');
                }
            } catch (e) {
                logger.debug('定时检测浏览器异常:', e?.message);
            }
        }, BROWSER_CHECK_INTERVAL_MS);
        logger.info(`浏览器实例定时检测已启动，间隔 ${BROWSER_CHECK_INTERVAL_MS / 1000} 秒`);
    }

    stopBrowserCheckTimer() {
        if (this.browserCheckTimer) {
            clearInterval(this.browserCheckTimer);
            this.browserCheckTimer = null;
            logger.info('浏览器实例定时检测已停止');
        }
    }

    /**
     * 停止服务器
     */
    stop() {
        this.stopBrowserCheckTimer();
        if (this.server) {
            this.server.close();
            logger.info('API服务器已停止');
        }
    }

    /**
     * 处理请求
     */
    async handleRequest(req, res) {
        // 设置CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        // 处理OPTIONS请求
        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        try {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const reqPath = url.pathname;
            const method = req.method;

            logger.info(`${method} ${reqPath}`);

            // API 路由
            if (reqPath.startsWith('/api')) {
                if (reqPath === '/api' && method === 'GET') {
                    await this.handleApiIndex(req, res);
                } else if (reqPath === '/api/docs' && method === 'GET') {
                    await this.handleApiDocs(req, res);
                } else if (reqPath === '/api/publish' && method === 'POST') {
                    await this.handlePublishUnified(req, res);
                } else if (reqPath === '/api/schedule' && method === 'POST') {
                    await this.handleCreateSchedule(req, res);
                } else if (reqPath === '/api/platforms' && method === 'GET') {
                    await this.handleGetPlatforms(req, res);
                } else if (reqPath === '/api/browser/status' && method === 'GET') {
                    await this.handleBrowserStatus(req, res);
                } else if (reqPath === '/api/browser/connect' && method === 'POST') {
                    await this.handleBrowserConnect(req, res);
                } else if (reqPath === '/api/browser/close' && method === 'POST') {
                    await this.handleBrowserClose(req, res);
                } else if (reqPath === '/api/browser/launch-with-debug' && method === 'POST') {
                    await this.handleBrowserLaunchDebug(req, res);
                } else if (reqPath === '/api/browser/check-port' && method === 'POST') {
                    await this.handleBrowserCheckPort(req, res);
                } else if (reqPath === '/api/browser/open-platform' && method === 'POST') {
                    await this.handleBrowserOpenPlatform(req, res);
                } else if ((reqPath === '/api/browser/check-and-reconnect' || reqPath === '/api/browser/check') && (method === 'POST' || method === 'GET')) {
                    await this.handleBrowserCheckAndReconnect(req, res);
                } else if (reqPath === '/api/upload' && method === 'POST') {
                    await this.handleUpload(req, res);
                } else if (reqPath === '/api/login-status' && method === 'GET') {
                    await this.handleLoginStatus(req, res);
                } else if (reqPath === '/api/browser/export-user-data' && method === 'GET') {
                    await this.handleExportUserData(req, res);
                } else if (reqPath === '/api/browser/import-user-data' && method === 'POST') {
                    await this.handleImportUserData(req, res);
                } else {
                    this.sendResponse(res, 404, { success: false, error: 'Not Found' });
                }
            } else {
                // 静态文件（前端）
                await this.serveStatic(req, res, reqPath);
            }

        } catch (error) {
            logger.error('请求处理错误:', error);
            this.sendResponse(res, 500, { error: error.message });
        }
    }

    /**
     * API 概览（供前端/外部发现）
     */
    async handleApiIndex(req, res) {
        const base = `http://${req.headers.host}`;
        this.sendResponse(res, 200, {
            name: 'Yishe Auto Browser API',
            version: '2.0',
            docs: `${base}/api/docs`,
            endpoints: [
                { method: 'GET', path: '/api', description: 'API 概览（本接口）' },
                { method: 'GET', path: '/api/docs', description: 'API 文档（JSON）' },
                { method: 'POST', path: '/api/publish', description: '发布（传 platforms 数组，单平台如 ["douyin"]）' },
                { method: 'POST', path: '/api/schedule', description: '创建定时发布' },
                { method: 'GET', path: '/api/platforms', description: '支持的平台列表' },
                { method: 'POST', path: '/api/upload', description: '上传视频/图片文件' },
                { method: 'GET', path: '/api/login-status', description: '各平台登录状态' },
                { method: 'GET', path: '/api/browser/status', description: '浏览器连接状态' },
                { method: 'POST', path: '/api/browser/connect', description: '连接浏览器' },
                { method: 'POST', path: '/api/browser/close', description: '关闭浏览器' },
                { method: 'POST', path: '/api/browser/launch-with-debug', description: '启动带调试端口的 Chrome' },
                { method: 'POST', path: '/api/browser/check-port', description: '检测 CDP 端口' },
                { method: 'POST', path: '/api/browser/open-platform', description: '在已连接浏览器中打开指定平台创作页' },
                { method: 'POST', path: '/api/browser/check-and-reconnect', description: '检测浏览器实例并可选重连（body: { reconnect?: boolean }）' },
                { method: 'GET', path: '/api/browser/check', description: '仅检测浏览器实例（不重连）' },
                { method: 'GET', path: '/api/browser/export-user-data', description: '导出 User Data 压缩包' },
                { method: 'POST', path: '/api/browser/import-user-data', description: '导入 User Data 压缩包' }
            ]
        });
    }

    /**
     * API 文档（机器可读的接口说明）
     */
    async handleApiDocs(req, res) {
        const base = `http://${req.headers.host}`;
        this.sendResponse(res, 200, {
            openapi: '3.0.0',
            info: { title: 'Yishe Auto Browser API', version: '2.0' },
            servers: [{ url: base }],
            paths: {
                '/api/publish': {
                    post: {
                        summary: '发布到平台（单平台或多平台统一接口）',
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        required: ['platforms', 'title', 'filePath'],
                                        properties: {
                                            platforms: { type: 'array', items: { type: 'string' }, description: '平台 ID 数组，单平台如 ["douyin"]，多平台如 ["douyin", "xiaohongshu"]' },
                                            title: { type: 'string' },
                                            filePath: { type: 'string', description: '本机视频/图片绝对路径（服务端可访问），如 C:\\videos\\demo.mp4，无需上传' },
                                            tags: { type: 'array', items: { type: 'string' } },
                                            scheduled: { type: 'boolean' },
                                            scheduleTime: { type: 'string', format: 'date-time' },
                                            concurrent: { type: 'boolean', description: '多平台时是否并发' },
                                            platformSettings: { type: 'object' }
                                        }
                                    }
                                }
                            }
                        },
                        responses: { 200: { description: '发布结果' } }
                    }
                }
            }
        });
    }

    /**
     * 统一发布：单平台与多平台均传 platforms（数组），如 ["douyin"] 或 ["douyin", "xiaohongshu"]
     */
    async handlePublishUnified(req, res) {
        const body = await this.parseBody(req);
        const { platforms, concurrent = false, ...publishInfo } = body;

        if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
            this.sendResponse(res, 400, { success: false, error: '请传 platforms（数组），单平台如 ["douyin"]，多平台如 ["douyin", "xiaohongshu"]' });
            return;
        }

        const result = await publishService.batchPublish(platforms, publishInfo, { concurrent });
        this.sendResponse(res, 200, result);
    }

    /**
     * 处理创建定时任务请求
     */
    async handleCreateSchedule(req, res) {
        const body = await this.parseBody(req);
        const { platforms, scheduleTime, ...publishInfo } = body;

        if (!platforms || !scheduleTime) {
            this.sendResponse(res, 400, { error: '缺少必要参数' });
            return;
        }

        const result = await publishService.createScheduleTask(platforms, publishInfo, scheduleTime);
        this.sendResponse(res, 200, result);
    }

    /**
     * 获取支持的平台列表
     */
    async handleGetPlatforms(req, res) {
        const platforms = publishService.getSupportedPlatforms();
        this.sendResponse(res, 200, { platforms });
    }

    /**
     * 获取浏览器状态（返回前先做存活检测，若窗口已关闭则清除引用，保证客户端/网页端看到的是实时状态）
     */
    async handleBrowserStatus(req, res) {
        try {
            await checkAndReconnectBrowser({ reconnect: false });
            const status = await getBrowserStatus();
            this.sendResponse(res, 200, { success: true, data: status });
        } catch (error) {
            this.sendResponse(res, 500, { success: false, message: error.message });
        }
    }

    /**
     * 连接浏览器
     * 若未传 mode: 'cdp'，则与前端一致：先 launch-with-debug（独立 user-data-dir）再 CDP 连接，避免占用系统 Chrome profile
     */
    async handleBrowserConnect(req, res) {
        try {
            const body = await this.parseBody(req).catch(() => ({})) || {};
            await checkAndReconnectBrowser({ reconnect: false });
            const statusBefore = await getBrowserStatus();
            if (statusBefore.hasInstance && statusBefore.isConnected) {
                this.sendResponse(res, 200, { success: true, data: statusBefore });
                return;
            }
            const explicitCdp = body && body.mode === 'cdp' && body.cdpEndpoint;
            if (explicitCdp) {
                await getOrCreateBrowser(body);
            } else {
                const port = Number(body.port) || 9222;
                const userDataDir = (body.cdpUserDataDir || body.userDataDir || getDefaultCdpUserDataDir()).trim();
                logger.info('API connect 未指定 CDP，先启动带调试端口的 Chrome（独立目录）再连接');
                launchWithDebugPort({ port, userDataDir });
                await sleep(3500);
                await getOrCreateBrowser({ mode: 'cdp', cdpEndpoint: `http://127.0.0.1:${port}` });
            }
            const status = await getBrowserStatus();
            this.sendResponse(res, 200, { success: true, data: status });
        } catch (error) {
            this.sendResponse(res, 500, { success: false, message: error.message });
        }
    }

    /**
     * 关闭浏览器
     */
    async handleBrowserClose(req, res) {
        try {
            await closeBrowser();
            const status = await getBrowserStatus();
            this.sendResponse(res, 200, { success: true, data: status });
        } catch (error) {
            this.sendResponse(res, 500, { success: false, message: error.message });
        }
    }

    /**
     * 启动带调试端口的浏览器
     */
    async handleBrowserLaunchDebug(req, res) {
        try {
            const body = await this.parseBody(req);
            const result = launchWithDebugPort(body);
            this.sendResponse(res, 200, { success: true, data: result });
        } catch (error) {
            this.sendResponse(res, 500, { success: false, message: error.message });
        }
    }

    /**
     * 检测 CDP 端口
     */
    async handleBrowserCheckPort(req, res) {
        try {
            const body = await this.parseBody(req);
            const { port = 9222 } = body;
            const http = await import('http');
            const url = `http://127.0.0.1:${port}/json/version`;
            const result = await new Promise((resolve) => {
                const req = http.default.get(url, { timeout: 3000 }, (resp) => {
                    let data = '';
                    resp.on('data', chunk => { data += chunk; });
                    resp.on('end', () => {
                        try {
                            const json = JSON.parse(data);
                            resolve({ ok: true, port, browser: json.Browser || json.browser });
                        } catch {
                            resolve({ ok: true, port, raw: data?.slice(0, 200) });
                        }
                    });
                });
                req.on('error', (e) => resolve({ ok: false, port, error: e.message }));
                req.on('timeout', () => { req.destroy(); resolve({ ok: false, port, error: '连接超时' }); });
            });
            this.sendResponse(res, 200, { success: true, data: result });
        } catch (error) {
            this.sendResponse(res, 500, { success: false, message: error.message });
        }
    }

    /**
     * 在已连接浏览器中打开指定平台创作页
     */
    async handleBrowserOpenPlatform(req, res) {
        try {
            const body = await this.parseBody(req);
            const { platform } = body;
            if (!platform || typeof platform !== 'string') {
                this.sendResponse(res, 400, { success: false, message: '请传 platform（如 douyin、xiaohongshu、weibo、kuaishou）' });
                return;
            }
            const config = PLATFORM_CONFIGS[platform];
            if (!config || !config.uploadUrl) {
                this.sendResponse(res, 400, { success: false, message: `不支持的平台: ${platform}` });
                return;
            }
            const browser = await getOrCreateBrowser();
            const page = await browser.newPage();
            await page.goto(config.uploadUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
            this.sendResponse(res, 200, { success: true, data: { platform, name: config.name, url: config.uploadUrl } });
        } catch (error) {
            this.sendResponse(res, 500, { success: false, message: error.message || '打开平台链接失败' });
        }
    }

    /**
     * 检测浏览器实例并可选重连（接口调用）
     * POST/GET /api/browser/check-and-reconnect 或 GET /api/browser/check
     * Body (POST): { reconnect?: boolean }，reconnect 为 true 时断开后尝试自动重连
     */
    async handleBrowserCheckAndReconnect(req, res) {
        try {
            let reconnect = false;
            if (req.method === 'POST') {
                const body = await this.parseBody(req).catch(() => ({}));
                reconnect = !!body.reconnect;
            }
            const result = await checkAndReconnectBrowser({ reconnect });
            this.sendResponse(res, 200, {
                success: true,
                available: result.available,
                reconnected: result.reconnected || false,
                message: result.message,
                status: result.status
            });
        } catch (error) {
            this.sendResponse(res, 500, { success: false, message: error.message || '检测失败' });
        }
    }

    /**
     * 导出 User Data
     */
    async handleExportUserData(req, res) {
        try {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const userDataDir = (url.searchParams.get('userDataDir') || getDefaultCdpUserDataDir()).trim();

            logger.info(`开始导出 User Data: ${userDataDir}`);
            const buffer = await exportUserData(userDataDir);

            const filename = `yishe-auto-browser-userdata-${new Date().toISOString().split('T')[0]}.zip`;
            res.writeHead(200, {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': buffer.length,
                'Access-Control-Expose-Headers': 'Content-Disposition'
            });
            res.end(buffer);
        } catch (error) {
            logger.error('导出失败:', error);
            this.sendResponse(res, 500, { success: false, message: error.message });
        }
    }

    /**
     * 导入 User Data
     */
    async handleImportUserData(req, res) {
        try {
            const contentType = req.headers['content-type'] || '';
            if (!contentType.includes('multipart/form-data')) {
                this.sendResponse(res, 400, { success: false, message: '需要 multipart/form-data' });
                return;
            }

            const m = contentType.match(/boundary=([^;\s]+)/);
            const boundary = m ? m[1].trim().replace(/^["']|["']$/g, '') : null;
            if (!boundary) {
                this.sendResponse(res, 400, { success: false, message: '缺少 boundary' });
                return;
            }

            if (!fs.existsSync(UPLOAD_DIR)) {
                await fs.promises.mkdir(UPLOAD_DIR, { recursive: true });
            }

            const uploadResult = await this.parseMultipart(req, Buffer.from(`--${boundary}`));
            if (!uploadResult.savedPath) {
                this.sendResponse(res, 400, { success: false, message: '未找到上传的文件' });
                return;
            }

            const url = new URL(req.url, `http://${req.headers.host}`);
            const userDataDir = (url.searchParams.get('userDataDir') || getDefaultCdpUserDataDir()).trim();

            logger.info(`开始导入 User Data 到: ${userDataDir}，文件: ${uploadResult.savedPath}`);
            await importUserData(uploadResult.savedPath, userDataDir);

            // 导入成功后删除临时 zip
            if (fs.existsSync(uploadResult.savedPath)) {
                fs.unlinkSync(uploadResult.savedPath);
            }

            this.sendResponse(res, 200, { success: true, message: '导入成功' });
        } catch (error) {
            logger.error('导入失败:', error);
            this.sendResponse(res, 500, { success: false, message: error.message });
        }
    }

    /**
     * 处理文件上传（发布用视频/图片）- 使用内置流解析 multipart，无第三方依赖
     */
    async handleUpload(req, res) {
        try {
            const contentType = req.headers['content-type'] || '';
            if (!contentType.includes('multipart/form-data')) {
                this.sendResponse(res, 400, { success: false, message: '需要 multipart/form-data' });
                return;
            }
            const m = contentType.match(/boundary=([^;\s]+)/);
            const boundary = m ? m[1].trim().replace(/^["']|["']$/g, '') : null;
            if (!boundary) {
                this.sendResponse(res, 400, { success: false, message: '缺少 boundary' });
                return;
            }
            if (!fs.existsSync(UPLOAD_DIR)) {
                await fs.promises.mkdir(UPLOAD_DIR, { recursive: true });
            }
            const result = await this.parseMultipart(req, Buffer.from(`--${boundary}`));
            if (!result.savedPath) {
                this.sendResponse(res, 400, { success: false, message: '未选择文件' });
                return;
            }
            const filename = path.basename(result.savedPath);
            logger.info('文件上传成功:', { path: result.savedPath, filename });
            this.sendResponse(res, 200, {
                success: true,
                path: result.savedPath,
                filename
            });
        } catch (error) {
            logger.error('上传失败:', error);
            this.sendResponse(res, 500, { success: false, message: error.message || '上传失败' });
        }
    }

    /**
     * 简易 multipart 解析：只提取第一个带 filename 的文件并写入 temp
     */
    parseMultipart(req, boundaryPrefix) {
        return new Promise((resolve, reject) => {
            const B = boundaryPrefix;
            const BCRLF = Buffer.from('\r\n');
            let state = 'preamble';
            let headers = '';
            let filename = null;
            let writeStream = null;
            let savedPath = null;
            let buffer = Buffer.alloc(0);
            let resolved = false;
            const maxBuffer = 1024 * 1024; // 1MB 用于边界检测

            function flushToFile(chunk) {
                if (writeStream && chunk.length) writeStream.write(chunk);
            }

            function finishFile() {
                if (writeStream) {
                    writeStream.end();
                    writeStream = null;
                }
                if (savedPath && !resolved) {
                    resolved = true;
                    resolve({ savedPath });
                    return true;
                }
                return false;
            }

            req.on('data', (chunk) => {
                if (resolved) return;
                buffer = Buffer.concat([buffer, chunk]);
                if (buffer.length > 256 * 1024 * 1024) {
                    buffer = buffer.subarray(buffer.length - maxBuffer);
                }
                while (buffer.length > 0) {
                    if (state === 'preamble' || state === 'between') {
                        const i = buffer.indexOf(B);
                        if (i === -1) {
                            const keep = Math.min(buffer.length, B.length + 4);
                            buffer = buffer.subarray(buffer.length - keep);
                            break;
                        }
                        buffer = buffer.subarray(i + B.length);
                        if (buffer[0] === 0x2d && buffer[1] === 0x2d) {
                            buffer = buffer.subarray(2);
                            if (finishFile()) return;
                            state = 'between';
                            continue;
                        }
                        const crlf = buffer.indexOf(BCRLF);
                        if (crlf !== 0) {
                            buffer = buffer.subarray(crlf >= 0 ? crlf : buffer.length);
                            break;
                        }
                        buffer = buffer.subarray(2);
                        state = 'headers';
                        headers = '';
                        filename = null;
                        continue;
                    }
                    if (state === 'headers') {
                        const idx = buffer.indexOf(Buffer.from('\r\n\r\n'));
                        if (idx === -1) {
                            headers += buffer.toString('utf8');
                            if (buffer.length > 8192) buffer = buffer.subarray(buffer.length - 128);
                            break;
                        }
                        headers += buffer.subarray(0, idx).toString('utf8');
                        buffer = buffer.subarray(idx + 4);
                        const fn = headers.match(/filename="([^"]*)"/);
                        const fnStar = headers.match(/filename\*=(?:utf-8'')?([^;\r\n]+)/);
                        filename = (fn && fn[1]) || (fnStar && decodeURIComponent(fnStar[1].trim())) || null;
                        if (filename) {
                            const ext = path.extname(filename) || '';
                            const base = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}${ext}`;
                            savedPath = path.join(UPLOAD_DIR, base);
                            writeStream = fs.createWriteStream(savedPath);
                        }
                        state = 'body';
                        continue;
                    }
                    if (state === 'body') {
                        const i = buffer.indexOf(B);
                        if (i === -1) {
                            const safe = Math.max(0, buffer.length - B.length - 4);
                            if (safe > 0) {
                                flushToFile(buffer.subarray(0, safe));
                                buffer = buffer.subarray(safe);
                            }
                            break;
                        }
                        const trim = i >= 2 && buffer[i - 2] === 0x0d && buffer[i - 1] === 0x0a ? 2 : 0;
                        flushToFile(buffer.subarray(0, i - trim));
                        buffer = buffer.subarray(i);
                        state = 'between';
                    }
                }
            });
            req.on('end', () => {
                if (resolved) return;
                if (buffer.length) flushToFile(buffer);
                if (!finishFile()) {
                    resolved = true;
                    resolve({ savedPath: savedPath || null });
                }
            });
            req.on('error', reject);
        });
    }

    /**
     * 获取各平台登录状态（用于发布前校验）
     */
    async handleLoginStatus(req, res) {
        try {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const forceRefresh = url.searchParams.get('refresh') === '1';
            const loginStatus = await PublishService.checkSocialMediaLoginStatus(forceRefresh);
            this.sendResponse(res, 200, { success: true, data: loginStatus });
        } catch (error) {
            logger.error('获取登录状态失败:', error);
            this.sendResponse(res, 500, { success: false, message: error.message || '获取登录状态失败' });
        }
    }

    /**
     * 解析请求体
     */
    async parseBody(req) {
        return new Promise((resolve, reject) => {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', () => {
                try {
                    resolve(body ? JSON.parse(body) : {});
                } catch (error) {
                    reject(new Error('Invalid JSON'));
                }
            });
            req.on('error', reject);
        });
    }

    /**
     * 发送响应
     */
    sendResponse(res, statusCode, data) {
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
    }

    /**
     * 提供前端静态文件
     */
    async serveStatic(req, res, reqPath) {
        try {
            const webExists = fs.existsSync(WEB_DIR);
            if (!webExists) {
                res.writeHead(503, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end('<h1>前端未构建</h1><p>请先执行: npm run web:build 或 cd web && npm run build</p>');
                return;
            }
        } catch {
            // ignore
        }

        const safePath = reqPath === '/' ? 'index.html' : reqPath.replace(/^\//, '');
        const filePath = path.join(WEB_DIR, safePath);
        const resolvedPath = path.resolve(filePath);
        if (!resolvedPath.startsWith(path.resolve(WEB_DIR))) {
            res.writeHead(403);
            res.end('Forbidden');
            return;
        }

        try {
            const stat = await fs.promises.stat(filePath);
            if (stat.isFile()) {
                const ext = path.extname(filePath);
                const mimeTypes = {
                    '.html': 'text/html; charset=utf-8',
                    '.js': 'text/javascript; charset=utf-8',
                    '.css': 'text/css; charset=utf-8',
                    '.json': 'application/json',
                    '.png': 'image/png',
                    '.jpg': 'image/jpeg',
                    '.gif': 'image/gif',
                    '.svg': 'image/svg+xml',
                    '.ico': 'image/x-icon',
                    '.woff': 'font/woff',
                    '.woff2': 'font/woff2'
                };
                const contentType = mimeTypes[ext] || 'application/octet-stream';
                res.writeHead(200, { 'Content-Type': contentType });
                fs.createReadStream(filePath).pipe(res);
            } else {
                const indexPath = path.join(WEB_DIR, 'index.html');
                res.writeHead(200, { 'Content-Type': 'text/html' });
                fs.createReadStream(indexPath).pipe(res);
            }
        } catch (err) {
            if (err.code === 'ENOENT') {
                const indexPath = path.join(WEB_DIR, 'index.html');
                try {
                    await fs.promises.access(indexPath);
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    fs.createReadStream(indexPath).pipe(res);
                } catch {
                    res.writeHead(404);
                    res.end('Not Found');
                }
            } else {
                res.writeHead(500);
                res.end('Internal Server Error');
            }
        }
    }
}

// 创建并导出服务器实例
const apiServer = new ApiServer();

export default apiServer;

// 作为入口运行时启动服务器（npm start 即 node src/api/server.js）
apiServer.start();
