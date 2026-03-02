#!/usr/bin/env node

/**
 * ADM-ZIP 导入错误修复 - 最终验证脚本
 * 
 * 用途：验证修复是否完全应用
 * 运行：node verify-fix.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🔍 开始验证 ADM-ZIP 导入修复...\n');

const checks = [];

// ============ 检查 1: server.js parseMultipart 改进 ============
console.log('1️⃣  检查 server.js 的 parseMultipart 改进...');
const serverPath = path.join(__dirname, 'src/api/server.js');
const serverCode = fs.readFileSync(serverPath, 'utf-8');

const checks1 = [
  {
    name: '包含 async flushToFile 实现',
    regex: /flushToFile\(chunk\)\s*\{\s*if\s*\(writeStream.*?\)\s*return\s*new\s*Promise/s,
    found: false
  },
  {
    name: '包含异步 finishFile 实现',
    regex: /finishFile\(\)\s*\{\s*if\s*\(!writeStream\).*?return\s*new\s*Promise/s,
    found: false
  },
  {
    name: '包含 finish 事件处理',
    regex: /writeStream\.once\('finish'/,
    found: false
  },
  {
    name: '包含 error 事件处理',
    regex: /writeStream\.once\('error'/,
    found: false
  },
  {
    name: '使用 processChunk 异步处理',
    regex: /const\s+processChunk\s*=\s*async\s*\(\)/,
    found: false
  }
];

checks1.forEach(check => {
  check.found = check.regex.test(serverCode);
  console.log(`  ${check.found ? '✅' : '❌'} ${check.name}`);
  checks.push({ file: 'server.js', ...check });
});

// ============ 检查 2: BrowserService.js 导入验证 ============
console.log('\n2️⃣  检查 BrowserService.js 的导入验证增强...');
const browserServicePath = path.join(__dirname, 'src/services/BrowserService.js');
const browserServiceCode = fs.readFileSync(browserServicePath, 'utf-8');

const checks2 = [
  {
    name: '包含文件大小验证',
    regex: /if\s*\(fileStats\.size\s*<\s*100\)/,
    found: false
  },
  {
    name: '包含 ZIP 文件大小日志',
    regex: /logger\.info.*?ZIP\s*文件大小.*?toFixed\(2\)/,
    found: false
  },
  {
    name: '包含 AdmZip 格式检查',
    regex: /zipInstance\s*=\s*new\s*AdmZip\(zipPath\)/,
    found: false
  },
  {
    name: '包含条目数检查',
    regex: /if\s*\(!entries\s*\|\|\s*entries\.length\s*===\s*0\)/,
    found: false
  },
  {
    name: '包含详细的 ZIP 错误提示',
    regex: /Invalid.*?或.*?损坏/,
    found: false
  }
];

checks2.forEach(check => {
  check.found = check.regex.test(browserServiceCode);
  console.log(`  ${check.found ? '✅' : '❌'} ${check.name}`);
  checks.push({ file: 'BrowserService.js', ...check });
});

// ============ 检查 3: Vue 文件前端增强 ============
console.log('\n3️⃣  检查 browser/index.vue 的前端验证...');
const vuePath = path.join(__dirname, 'web/src/views/browser/index.vue');
const vueCode = fs.readFileSync(vuePath, 'utf-8');

const checks3 = [
  {
    name: '包含 .zip 文件扩展名检查',
    regex: /endsWith\('\.zip'\)/,
    found: false
  },
  {
    name: '包含文件大小下限检查（100字节）',
    regex: /file\.size\s*<\s*100/,
    found: false
  },
  {
    name: '包含文件大小上限检查（1GB）',
    regex: /1024\s*\*\s*1024\s*\*\s*1024/,
    found: false
  },
  {
    name: '包含 AbortController 超时控制',
    regex: /new\s+AbortController\(\)/,
    found: false
  },
  {
    name: '包含 10 分钟超时设置',
    regex: /600000.*?10.*?分钟/,
    found: false
  },
  {
    name: '包含详细的 ZIP 错误提示',
    regex: /ZIP.*?请确保.*?有效/,
    found: false
  }
];

checks3.forEach(check => {
  check.found = check.regex.test(vueCode);
  console.log(`  ${check.found ? '✅' : '❌'} ${check.name}`);
  checks.push({ file: 'browser/index.vue', ...check });
});

// ============ 总结 ============
console.log('\n' + '='.repeat(50));
const passed = checks.filter(c => c.found).length;
const total = checks.length;
console.log(`\n✨ 验证结果: ${passed}/${total} 检查通过`);

if (passed === total) {
  console.log('\n🎉 所有修复都已正确应用！');
  console.log('\n修复涵盖的改进：');
  console.log('  ✅ Multipart 文件上传处理 - 确保 ZIP 完整性');
  console.log('  ✅ ZIP 文件验证 - 检查格式和完整性');
  console.log('  ✅ 前端验证 - 类型、大小、超时检查');
  console.log('  ✅ 错误处理 - 详细的错误提示');
  console.log('\n建议的下一步：');
  console.log('  1. npm run dev  - 启动开发环境测试');
  console.log('  2. 尝试导出和导入 User Data');
  console.log('  3. 测试异常情况（非 ZIP 文件、损坏 ZIP 等）');
  process.exit(0);
} else {
  console.log('\n⚠️  某些修复未完全应用，请检查以下文件：');
  const failedFiles = new Set(checks.filter(c => !c.found).map(c => c.file));
  failedFiles.forEach(file => {
    console.log(`  - ${file}`);
  });
  console.log('\n❌ 请手动检查和应用这些修复。');
  process.exit(1);
}
