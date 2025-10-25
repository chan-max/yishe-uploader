#!/usr/bin/env node

/**
 * 使用真实认证信息请求小红书接口
 * 基于用户提供的成功请求信息
 */

import { getOrCreateBrowser } from '../src/services/BrowserService.js';
import { setupAntiDetection } from '../src/services/BrowserService.js';
import { logger } from '../src/utils/logger.js';
import chalk from 'chalk';

/**
 * 使用真实认证信息
 */
async function useRealAuth() {
    let page = null;
    try {
        console.log(chalk.cyan('🔐 使用真实认证信息请求小红书接口...'));

        const browser = await getOrCreateBrowser();
        page = await browser.newPage();

        await setupAntiDetection(page);

        // 设置真实的Cookie
        const realCookies = [
            {
                name: 'abRequestId',
                value: '35328789-b536-51f7-952d-7867750a6dd4',
                domain: '.xiaohongshu.com',
                path: '/',
                httpOnly: false,
                secure: true,
                sameSite: 'Lax'
            },
            {
                name: 'a1',
                value: '199dad7771a8rzviphr8p5q1kiv1ezy9cig6fvf8p30000125998',
                domain: '.xiaohongshu.com',
                path: '/',
                httpOnly: false,
                secure: true,
                sameSite: 'Lax'
            },
            {
                name: 'webId',
                value: '5be556998523bb3cea465804755c0551',
                domain: '.xiaohongshu.com',
                path: '/',
                httpOnly: false,
                secure: true,
                sameSite: 'Lax'
            },
            {
                name: 'gid',
                value: 'yjjf0fWj4dS4yjjf0fWWW3hiy0YFuh3UxFYUkYU2AyT3hKq8yduvji888yJ2jjY8Dqi240SY',
                domain: '.xiaohongshu.com',
                path: '/',
                httpOnly: false,
                secure: true,
                sameSite: 'Lax'
            },
            {
                name: 'web_session',
                value: '040069b674b14d2468cc1a77d93a4b56c3ba5c',
                domain: '.xiaohongshu.com',
                path: '/',
                httpOnly: true,
                secure: true,
                sameSite: 'Lax'
            },
            {
                name: 'xsecappid',
                value: 'ugc',
                domain: '.xiaohongshu.com',
                path: '/',
                httpOnly: false,
                secure: true,
                sameSite: 'Lax'
            },
            {
                name: 'customer-sso-sid',
                value: '68c517565058608251437058hxpaclpo5lt28ue0',
                domain: '.xiaohongshu.com',
                path: '/',
                httpOnly: true,
                secure: true,
                sameSite: 'Lax'
            },
            {
                name: 'x-user-id-creator.xiaohongshu.com',
                value: '6700f205000000001d02389a',
                domain: 'creator.xiaohongshu.com',
                path: '/',
                httpOnly: false,
                secure: true,
                sameSite: 'Lax'
            },
            {
                name: 'customerClientId',
                value: '177768468521187',
                domain: '.xiaohongshu.com',
                path: '/',
                httpOnly: false,
                secure: true,
                sameSite: 'Lax'
            },
            {
                name: 'access-token-creator.xiaohongshu.com',
                value: 'customer.creator.AT-68c517565058608251437059eudli7beb6egewuq',
                domain: 'creator.xiaohongshu.com',
                path: '/',
                httpOnly: true,
                secure: true,
                sameSite: 'Lax'
            },
            {
                name: 'galaxy_creator_session_id',
                value: 'ffusSv4aGlsaeWmW2KdcOp6L4IGgXEX21CUM',
                domain: '.xiaohongshu.com',
                path: '/',
                httpOnly: false,
                secure: true,
                sameSite: 'Lax'
            },
            {
                name: 'galaxy.creator.beaker.session.id',
                value: '1761377465550066229511',
                domain: '.xiaohongshu.com',
                path: '/',
                httpOnly: false,
                secure: true,
                sameSite: 'Lax'
            },
            {
                name: 'websectiga',
                value: '3633fe24d49c7dd0eb923edc8205740f10fdb18b25d424d2a2322c6196d2a4ad',
                domain: '.xiaohongshu.com',
                path: '/',
                httpOnly: false,
                secure: true,
                sameSite: 'Lax'
            },
            {
                name: 'loadts',
                value: '1761379591896',
                domain: '.xiaohongshu.com',
                path: '/',
                httpOnly: false,
                secure: false,
                sameSite: 'Lax'
            },
            {
                name: 'sec_poison_id',
                value: '58366717-1d2d-4342-b8e0-b50d7b939770',
                domain: '.xiaohongshu.com',
                path: '/',
                httpOnly: false,
                secure: true,
                sameSite: 'Lax'
            },
            {
                name: 'acw_tc',
                value: '0a4a8a3717613795963032135e8ed9b9fc2d361b23e59045593b939ca39fc9',
                domain: '.xiaohongshu.com',
                path: '/',
                httpOnly: false,
                secure: true,
                sameSite: 'Lax'
            }
        ];

        // 设置Cookie
        console.log(chalk.blue('🍪 设置真实Cookie...'));
        for (const cookie of realCookies) {
            try {
                await page.setCookie(cookie);
                console.log(chalk.green(`✅ 设置Cookie: ${cookie.name}`));
            } catch (error) {
                console.log(chalk.yellow(`⚠️ 设置Cookie失败: ${cookie.name} - ${error.message}`));
            }
        }

        // 设置请求拦截器，添加真实的请求头
        await page.setRequestInterception(true);
        
        page.on('request', (request) => {
            const url = request.url();
            
            if (url.includes('xiaohongshu.com') && url.includes('/web_api/')) {
                console.log(chalk.blue(`📡 拦截API请求: ${url}`));
                
                // 使用真实的请求头
                const headers = {
                    ...request.headers(),
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Encoding': 'gzip, deflate, br, zstd',
                    'Accept-Language': 'zh-CN,zh;q=0.9',
                    'Cache-Control': 'no-cache',
                    'Origin': 'https://creator.xiaohongshu.com',
                    'Pragma': 'no-cache',
                    'Referer': 'https://creator.xiaohongshu.com/',
                    'Sec-Ch-Ua': '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
                    'Sec-Ch-Ua-Mobile': '?0',
                    'Sec-Ch-Ua-Platform': '"macOS"',
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'same-site',
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
                    'X-B3-Traceid': '496c7aabb8dc22d5',
                    'X-S': 'XYS_2UQhPsHCH0c1PjhhHjIj2erjwjQM89PjNsQhPjHCHDMYGUmOLUHVHdWAH0ijJnEAPerIPpuInBihad4/+BbyJfzV/dSBpepOt9+9P0pMnSQ6+gcAPfpHLA+0cSHEGdY1p7kd+Srh87YFPfhALnMs+fzD2BzGPnGM+pQCG/px8bYtyMQYGDEcpMYyaAYfa7LU+b+L/fD78dmyJ9zHPBReqepB8FW3wBpLnePhnDEsN7SM8aVU+LlocSDE2jTFz7GI+/zDP7mMLrzk/FRTG04VcfYd4BELHjIj2ecjwjHjKc==',
                    'X-S-Common': '2UQAPsHCPUIjqArjwjHjNsQhPsHCH0rjNsQhPaHCH0c1PjhhHjIj2eHjwjQ+GnPW/MPjNsQhPUHCHdpdGUHVHdWFH0ijPshEPUh7HjIj2eLjwjHlw/SDGnc7+AqlG/YU2d8kqBYUwoZMq/b3ygGl8gkEwn+k8A8f4fGhqePIPeZIP/HMw/DhHjIj2eGjwjHjNsQh+UHCHjHVHdWhH0ija/PhqDYD87+xJ7mdag8Sq9zn494QcUT6aLpPJLQy+nLApd4G/B4BprShLA+jqg4bqD8S8gYDPBp3Jf+m2DMBnnEl4BYQyrkSL9E+zrTM4bQQPFTAnnRUpFYc4r4UGSGILeSg8DSkN9pgGA8SngbF2pbmqbmQPA4Sy9Ma+SbPtApQy/8A8BES8p+fqpSHqg4VPdbF+LHIzrQQ2sV3zFzkN7+n4BTQ2BzA2op7q0zl4BSQyopYaLLA8/+Pp0mQPM8LaLP78/mM4BIUcLzTqFl98Lz/a7+/LoqMaLp9q9Sn4rkOqgqhcdp78SmI8BpLzS4OagWFprSk4/8yLo4ULopF+LS9JBbPGf4AP7bF2rSh8gPlpd4HanTMJLS3agSSyf4AnaRgpB4S+9p/qgzSNFc7qFz0qBSI8nzSngQr4rSe+fprpdqUaLpwqM+l4Bl1Jb+M/fkn4rS9J9p3qgcAGMi7qM86+B4Qzp+EanYbqaVEzbpQ4dkE+rDh/FSkGA4yLo4mag8kL0z6N7+r/BzA+Sm7pDSe+9p/8e4Sy0S/+rSb4dPAapm+4b87pLSk8oPAqURA2bkw8nSn4BQ0pnpSnp87yrS9zaRC8npS8db74Dls/7+fLo4UagYV4rShnS+64g4O8M87qo+U+BYSpaRS+Dl98Lzc4F8Q4f4APgQ6qAbrnfSQy/4AyfQ6qA+dqD8Qz/mAzob7arS9JpkYpdzfJdp7GLSb+7+rqg4hanSwqA+M4ApQy78A8obFJo4M4Fl6pdzgagWF8rSe/nLF8FYmtFSw8nSl4BkQyoQFanVI8nkl49R1npbCG9bSqFzspSpQzLMjt7bFJ7Sn4rlQcFTA2bm7yAzV8nLlqrRAyLMT/rSkcg+h+9RApopF2n+c49RQ404S8S878DS387P9Pb46aL+N8nz6N9pgpdcAa/P78p8l4APhcSSUanYHtFSe+d+hanRS+0S98nzU/7+8Lo4naLpVyFSezFp0pd4lanTHLFSk89phnSbyaASd8pSM4A8Qy9PhJdp7yozP8Bpka/mAL7pFq9El4e+QPF4OaLpz+Bpc4ob74g4Ta/P6q9k8PBLApd4M+obF2rSeG0bF4gzcanSop7z8yL8QPApA2B8OqAZE89pk4gqh/dbFJDSkp9MQy9RAPpmF4LSb/9pfzSQnaL+b/fpTzgSQcMSyag8N8p8n4ApPLozMGSmFqrSkG9+QcFRA8bqM8nkn4Mmo8bk1aLpo+URc4BYwqgz+anSPJLS3G04Q2BlTagGI8pSf4d+DJfQHcS87zrS9G9pj4g4j2S8FwLSk+7P9J7H6aLpHyfpx8oPILozM/obF4UHVHdWEH0iTP/GMwecI+AcU+aIj2erIH0iINsQhP/rjwjQ1J7QTGnIjKc==',
                    'X-T': '1761379614411',
                    'X-Xray-Traceid': 'cd0d33ff447fc06c4d361da526e2594e'
                };
                
                request.continue({ headers });
            } else {
                request.continue();
            }
        });

        // 监听响应
        page.on('response', async (response) => {
            const url = response.url();
            if (url.includes('xiaohongshu.com') && url.includes('/web_api/')) {
                console.log(chalk.blue(`📡 API响应: ${url}`));
                console.log(chalk.blue(`   状态: ${response.status()}`));
                
                if (response.status() === 200) {
                    console.log(chalk.green('✅ API请求成功！'));
                    try {
                        const responseText = await response.text();
                        console.log(chalk.blue('📄 响应内容:'));
                        console.log(responseText);
                    } catch (e) {
                        console.log(chalk.yellow('无法获取响应内容'));
                    }
                } else if (response.status() === 401) {
                    console.log(chalk.red('❌ 401错误 - 认证失败'));
                } else {
                    console.log(chalk.yellow(`⚠️ 其他状态码: ${response.status()}`));
                }
            }
        });

        // 导航到小红书
        console.log(chalk.blue('🌐 正在访问小红书...'));
        await page.goto('https://creator.xiaohongshu.com/', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        await new Promise(resolve => setTimeout(resolve, 3000));

        // 测试API请求
        console.log(chalk.yellow('🧪 测试API请求...'));
        try {
            const response = await page.goto('https://edith.xiaohongshu.com/web_api/sns/v5/creator/topic/template/list', {
                waitUntil: 'networkidle2',
                timeout: 10000
            });
            
            console.log(chalk.blue(`📡 最终响应状态: ${response.status()}`));
            
        } catch (error) {
            console.log(chalk.red(`❌ API请求出错: ${error.message}`));
        }

    } catch (error) {
        console.error(chalk.red('❌ 使用真实认证失败:'), error.message);
    } finally {
        if (page) {
            try {
                await page.close();
            } catch (closeError) {
                console.warn(chalk.yellow('⚠️ 关闭页面时出错:'), closeError.message);
            }
        }
    }
}

/**
 * 主函数
 */
async function main() {
    try {
        await useRealAuth();
    } catch (error) {
        console.error(chalk.red('❌ 执行过程出错:'), error.message);
        process.exit(1);
    }
}

// 如果直接运行此脚本
if (import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
    main();
}

export { useRealAuth };
