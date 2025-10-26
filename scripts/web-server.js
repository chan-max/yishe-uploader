/*
 * @Author: chan-max jackieontheway666@gmail.com
 * @Date: 2025-01-27 10:00:00
 * @LastEditors: chan-max jackieontheway666@gmail.com
 * @LastEditTime: 2025-01-27 10:00:00
 * @FilePath: /yishe-uploader/scripts/web-server.js
 * @Description: Web 服务器 - 提供 Web 界面来操作各种脚本功能
 */

// 禁用 TLS 验证以支持自签名证书
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
console.warn('⚠️  TLS 证书验证已禁用');

import express from 'express';
import cors from 'cors';
import {
    fileURLToPath
} from 'url';
import {
    dirname,
    join
} from 'path';
import {
    exec
} from 'child_process';
import {
    promisify
} from 'util';
import open from 'open';
import chalk from 'chalk';

const execAsync = promisify(exec);
const __filename = fileURLToPath(
    import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, '../web')));

// 工具函数：执行脚本
async function executeScript(scriptPath, args = []) {
    try {
        const command = `node ${scriptPath} ${args.join(' ')}`;
        console.log(chalk.blue(`执行命令: ${command}`));

        const {
            stdout,
            stderr
        } = await execAsync(command, {
            cwd: join(__dirname, '..'),
            timeout: 300000 // 5分钟超时
        });

        return {
            success: true,
            stdout: stdout.trim(),
            stderr: stderr.trim()
        };
    } catch (error) {
        console.error(chalk.red(`脚本执行失败: ${error.message}`));
        return {
            success: false,
            error: error.message,
            stdout: error.stdout || '',
            stderr: error.stderr || ''
        };
    }
}

// API 路由

// 检查登录状态
app.post('/api/check-login', async (req, res) => {
    try {
        const result = await executeScript('scripts/check-login.js');
        res.json({
            success: result.success,
            data: result.stdout,
            error: result.error
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 查询单个产品
app.post('/api/query-product', async (req, res) => {
    try {
        const {
            env = 'prod', productId, productCode
        } = req.body;

        if (!productId && !productCode) {
            return res.status(400).json({
                success: false,
                error: '请提供产品ID或产品代码'
            });
        }

        const args = [env];
        if (productId) {
            args.push(productId);
        } else {
            args.push('', productCode);
        }

        const result = await executeScript('scripts/query-single-product.js', args);
        res.json({
            success: result.success,
            data: result.stdout,
            error: result.error
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 发布单个产品
app.post('/api/publish-product', async (req, res) => {
    try {
        const {
            env = 'prod', productId, productCode, platforms = 'xiaohongshu,weibo,douyin,kuaishou'
        } = req.body;

        if (!productId && !productCode) {
            return res.status(400).json({
                success: false,
                error: '请提供产品ID或产品代码'
            });
        }

        const args = [env];
        if (productId) {
            args.push(productId);
        } else {
            args.push('', productCode);
        }
        args.push(platforms);

        const result = await executeScript('scripts/publish-single-product.js', args);
        res.json({
            success: result.success,
            data: result.stdout,
            error: result.error
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 单平台发布
app.post('/api/publish-platform', async (req, res) => {
    try {
        const {
            platform,
            env = 'prod'
        } = req.body;

        if (!platform) {
            return res.status(400).json({
                success: false,
                error: '请指定发布平台'
            });
        }

        const scriptMap = {
            weibo: 'scripts/publish-weibo.js',
            douyin: 'scripts/publish-douyin.js',
            xiaohongshu: 'scripts/publish-xiaohongshu.js',
            kuaishou: 'scripts/publish-kuaishou.js'
        };

        const scriptPath = scriptMap[platform];
        if (!scriptPath) {
            return res.status(400).json({
                success: false,
                error: '不支持的平台'
            });
        }

        const result = await executeScript(scriptPath, [env]);
        res.json({
            success: result.success,
            data: result.stdout,
            error: result.error
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 批量发布所有平台
app.post('/api/publish-all', async (req, res) => {
    try {
        const {
            env = 'prod', dataIndex = '0', platforms = 'xiaohongshu,weibo,douyin,kuaishou'
        } = req.body;

        const result = await executeScript('scripts/publish-all-platforms.js', [env, dataIndex, platforms]);
        res.json({
            success: result.success,
            data: result.stdout,
            error: result.error
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 浏览器管理
app.post('/api/browser', async (req, res) => {
    try {
        const {
            action
        } = req.body;

        let scriptPath, args = [];

        switch (action) {
            case 'start':
                scriptPath = 'scripts/start-browser.js';
                break;
            case 'start-keep':
                scriptPath = 'scripts/start-browser.js';
                args = ['--keep-open'];
                break;
            case 'status':
                scriptPath = 'scripts/browser-status.js';
                break;
            case 'close':
                scriptPath = 'scripts/browser-status.js';
                args = ['--close'];
                break;
            default:
                return res.status(400).json({
                    success: false,
                    error: '不支持的操作'
                });
        }

        const result = await executeScript(scriptPath, args);
        res.json({
            success: result.success,
            data: result.stdout,
            error: result.error
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 同步小红书认证
app.post('/api/sync-xiaohongshu', async (req, res) => {
    try {
        const result = await executeScript('scripts/sync-xiaohongshu-cookies.js');
        res.json({
            success: result.success,
            data: result.stdout,
            error: result.error
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 从文件发布
app.post('/api/publish-from-file', async (req, res) => {
    try {
        const result = await executeScript('scripts/publish-from-file.js');
        res.json({
            success: result.success,
            data: result.stdout,
            error: result.error
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 启动服务器
app.listen(PORT, () => {
    console.log(chalk.green(`🚀 Web 服务器已启动`));
    console.log(chalk.blue(`📱 访问地址: http://localhost:${PORT}`));
    console.log(chalk.yellow(`⏰ 启动时间: ${new Date().toLocaleString()}`));
    console.log(chalk.cyan(`🔧 支持的功能:`));
    console.log(chalk.cyan(`   - 检查登录状态`));
    console.log(chalk.cyan(`   - 查询产品信息`));
    console.log(chalk.cyan(`   - 单产品发布`));
    console.log(chalk.cyan(`   - 单平台发布`));
    console.log(chalk.cyan(`   - 批量发布`));
    console.log(chalk.cyan(`   - 浏览器管理`));
    console.log(chalk.cyan(`   - 小红书认证同步`));
    console.log(chalk.cyan(`   - 从文件发布`));
    console.log('');

    // 自动打开浏览器
    setTimeout(async () => {
        try {
            await open(`http://localhost:${PORT}`);
            console.log(chalk.green(`🌐 已自动打开浏览器`));
        } catch (error) {
            console.log(chalk.yellow(`⚠️  无法自动打开浏览器，请手动访问: http://localhost:${PORT}`));
        }
    }, 1000);
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log(chalk.yellow('\n🛑 正在关闭服务器...'));
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log(chalk.yellow('\n🛑 正在关闭服务器...'));
    process.exit(0);
});