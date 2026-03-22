import { BrowserService } from '../src/services/BrowserService.js';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
process.env.PWDEBUG = process.env.PWDEBUG || '1';

async function main() {
  const targetUrl = process.argv[2] || 'about:blank';

  console.log(`启动 Playwright Inspector: ${targetUrl}`);
  console.log('浏览器会打开，并在 page.pause() 处进入可交互调试状态。');

  const browser = await BrowserService.getOrCreateBrowser({ headless: false });
  const page = await browser.newPage();

  await page.goto(targetUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  }).catch(() => {});

  console.log('Inspector 已就绪。你可以在 Playwright Inspector 中点选元素、执行步骤、恢复运行。');
  await page.pause();

  console.log('Inspector 已退出，关闭浏览器...');
  await BrowserService.close();
}

main().catch(async error => {
  console.error(`启动 Inspector 失败: ${error?.message || error}`);
  try {
    await BrowserService.close();
  } catch {
    // ignore
  }
  process.exit(1);
});
