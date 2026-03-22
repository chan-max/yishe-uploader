import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { BrowserService } from '../src/services/BrowserService.js';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

function parseArgs(raw) {
  const result = [];
  const regex = /"([^"]*)"|'([^']*)'|`([^`]*)`|(\S+)/g;
  let match;
  while ((match = regex.exec(raw)) !== null) {
    result.push(match[1] ?? match[2] ?? match[3] ?? match[4]);
  }
  return result;
}

function printHelp() {
  console.log(`
Commands:
  help
  status
  pages
  use <index>
  goto <url>
  reload
  click <selector>
  fill <selector> <text>
  type <selector> <text>
  press <selector> <key>
  wait <ms>
  text <selector>
  html <selector>
  count <selector>
  eval <javascript>
  screenshot <path>
  url
  title
  exit

Examples:
  goto https://example.com
  click "button:has-text('登录')"
  fill "input[placeholder='标题']" "测试标题"
  text ".user-name"
  eval document.title
`);
}

async function main() {
  console.log('启动 Playwright 调试壳...');
  console.log('默认使用有界面浏览器，你在终端输入命令，浏览器会实时执行。');

  const browser = await BrowserService.getOrCreateBrowser({ headless: false });
  let page = null;

  const ensurePage = async () => {
    const status = await BrowserService.getStatus();
    if (!page) {
      const fresh = await browser.newPage();
      page = fresh;
    }
    return { status, page };
  };

  await ensurePage();
  printHelp();

  const rl = readline.createInterface({ input, output });

  while (true) {
    const line = (await rl.question('pw> ')).trim();
    if (!line) continue;

    const [command, ...rest] = parseArgs(line);
    try {
      const current = (await ensurePage()).page;

      switch ((command || '').toLowerCase()) {
        case 'help':
          printHelp();
          break;
        case 'status': {
          const status = await BrowserService.getStatus();
          console.log(JSON.stringify(status, null, 2));
          break;
        }
        case 'pages': {
          const pages = current.context().pages();
          pages.forEach((item, index) => {
            const mark = item === current ? '*' : ' ';
            console.log(`${mark} [${index}] ${item.url() || 'about:blank'}`);
          });
          break;
        }
        case 'use': {
          const index = Number(rest[0]);
          const pages = current.context().pages();
          if (!Number.isInteger(index) || !pages[index]) {
            console.log('无效页索引');
            break;
          }
          page = pages[index];
          console.log(`已切换到页面 ${index}: ${page.url() || 'about:blank'}`);
          break;
        }
        case 'goto':
          await current.goto(rest[0], { waitUntil: 'domcontentloaded', timeout: 30000 });
          console.log(`OK ${current.url()}`);
          break;
        case 'reload':
          await current.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
          console.log(`OK ${current.url()}`);
          break;
        case 'click':
          await current.locator(rest[0]).click();
          console.log('clicked');
          break;
        case 'fill':
          await current.locator(rest[0]).fill(rest.slice(1).join(' '));
          console.log('filled');
          break;
        case 'type':
          await current.locator(rest[0]).pressSequentially(rest.slice(1).join(' '));
          console.log('typed');
          break;
        case 'press':
          await current.locator(rest[0]).press(rest[1]);
          console.log('pressed');
          break;
        case 'wait':
          await current.waitForTimeout(Number(rest[0]) || 1000);
          console.log('done');
          break;
        case 'text': {
          const text = await current.locator(rest[0]).first().textContent();
          console.log(text ?? '');
          break;
        }
        case 'html': {
          const html = await current.locator(rest[0]).first().innerHTML();
          console.log(html);
          break;
        }
        case 'count': {
          const count = await current.locator(rest[0]).count();
          console.log(count);
          break;
        }
        case 'eval': {
          const js = line.replace(/^eval\s+/, '');
          const result = await current.evaluate(expression => {
            // Debug shell only; runs arbitrary user JS in page context.
            return globalThis.eval(expression);
          }, js);
          console.log(typeof result === 'string' ? result : JSON.stringify(result, null, 2));
          break;
        }
        case 'screenshot':
          await current.screenshot({ path: rest[0] || `debug-${Date.now()}.png`, fullPage: true });
          console.log('saved');
          break;
        case 'url':
          console.log(current.url());
          break;
        case 'title':
          console.log(await current.title());
          break;
        case 'exit':
        case 'quit':
          rl.close();
          await BrowserService.close();
          process.exit(0);
          break;
        default:
          console.log('未知命令，输入 help 查看支持的命令');
          break;
      }
    } catch (error) {
      console.error(`ERROR: ${error?.message || error}`);
    }
  }
}

main().catch(async (error) => {
  console.error(`启动失败: ${error?.message || error}`);
  try {
    await BrowserService.close();
  } catch {
    // ignore
  }
  process.exit(1);
});
