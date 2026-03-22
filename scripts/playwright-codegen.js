import { spawn } from 'node:child_process';

const targetUrl = process.argv[2] || 'about:blank';
const extraArgs = process.argv.slice(3);
const hasBrowserArg = extraArgs.some(arg => arg === '--browser' || arg.startsWith('--browser='));
const hasChannelArg = extraArgs.some(arg => arg === '--channel' || arg.startsWith('--channel='));

const defaultBrowserArgs = [];
if (!hasBrowserArg && !hasChannelArg) {
  defaultBrowserArgs.push('--channel=chrome');
}

const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const args = ['playwright', 'codegen', targetUrl, ...defaultBrowserArgs, ...extraArgs];

console.log(`启动 Playwright codegen: ${targetUrl}`);
if (defaultBrowserArgs.length) {
  console.log(`默认使用系统 Chrome: ${defaultBrowserArgs.join(' ')}`);
}

const child = spawn(command, args, {
  stdio: 'inherit',
  cwd: process.cwd(),
  env: {
    ...process.env,
    NODE_TLS_REJECT_UNAUTHORIZED: '0'
  }
});

child.on('exit', code => {
  process.exit(code ?? 0);
});

child.on('error', error => {
  console.error(`启动 codegen 失败: ${error?.message || error}`);
  console.error('如果仍然提示缺少 Playwright 浏览器，可手动执行: npx playwright install');
  process.exit(1);
});
