#!/usr/bin/env node

/**
 * Sora 爬虫快速测试脚本
 * 
 * 使用方法：
 *   1) 先启动后端服务：npm start（或 npm run dev）
 *   2) 在另一个终端运行：node scripts/test-sora-crawler.js
 *   3) 或指定自定义数量：node scripts/test-sora-crawler.js --max-images 10
 */

import http from 'http';

const API_BASE = process.env.API_BASE || 'http://localhost:7010';

function parseArgs() {
    const args = process.argv.slice(2);
    const config = { maxImages: 20 };

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--max-images' && args[i + 1]) {
            config.maxImages = Number(args[i + 1]);
            i++;
        }
    }

    return config;
}

function request(method, path, body) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, API_BASE);
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve({ raw: data, status: res.statusCode });
                }
            });
        });

        req.on('error', reject);

        if (body) {
            req.write(JSON.stringify(body));
        }

        req.end();
    });
}

async function testSoraCrawler() {
    const config = parseArgs();

    console.log('🚀 开始测试 Sora 爬虫...\n');
    console.log(`📍 API 地址: ${API_BASE}`);
    console.log(`📸 最大图片数: ${config.maxImages}\n`);

    try {
        // 1. 检查爬虫服务健康状态
        console.log('1️⃣  检查爬虫服务健康状态...');
        const health = await request('GET', '/api/crawler/health');
        console.log(`✅ 爬虫服务状态: ${health.status || 'ok'}`);
        console.log(`   支持的站点: ${(health.supportedSites || []).join(', ')}\n`);

        // 2. 列出可用站点
        console.log('2️⃣  获取可用站点列表...');
        const sites = await request('GET', '/api/crawler/sites');
        console.log(`✅ 可用站点: ${(sites.sites || []).join(', ')}\n`);

        // 3. 执行 Sora 爬虫
        console.log('3️⃣  执行 Sora 爬虫任务...');
        console.log(`   ⏳ 这可能需要 30-60 秒，请耐心等待...\n`);

        const startTime = Date.now();
        const result = await request('POST', '/api/crawler/run', {
            site: 'sora',
            params: {
                maxImages: config.maxImages
            }
        });
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        if (result.success) {
            console.log(`✅ Sora 爬虫执行成功（耗时 ${duration}s）\n`);

            const data = result.data || {};
            console.log(`📄 页面标题: ${data.title}`);
            console.log(`🔗 页面 URL: ${data.url}`);
            console.log(`📸 提取图片总数: ${data.totalImages}`);
            console.log(`📅 爬取时间: ${data.crawledAt}\n`);

            if (data.images && Array.isArray(data.images) && data.images.length > 0) {
                console.log('📋 提取的图片列表（前3张）：\n');
                data.images.slice(0, 3).forEach((img, idx) => {
                    console.log(`   #${idx + 1} - ${img.alt || '(无标题)'}`);
                    console.log(`        URL: ${img.url.slice(0, 80)}${img.url.length > 80 ? '...' : ''}`);
                    if (img.description) {
                        console.log(`        描述: ${img.description.slice(0, 80)}${img.description.length > 80 ? '...' : ''}`);
                    }
                    console.log();
                });

                console.log(`✅ 完整结果存储位置: ${data.images.length} 张图片`);
            } else {
                console.log('⚠️  未提取到图片数据');
            }
        } else {
            console.log(`❌ 爬虫执行失败`);
            console.log(`   错误信息: ${result.message || JSON.stringify(result)}`);
        }
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        console.log('\n💡 请确保：');
        console.log('   1. 后端服务已启动 (npm start)');
        console.log('   2. 服务地址正确: ' + API_BASE);
        console.log('   3. 网络连接正常');
    }
}

testSoraCrawler();
