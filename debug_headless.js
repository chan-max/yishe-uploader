/**
 * 诊断脚本：检查 headless 模式配置
 */

console.log('========== 环境变量检查 ==========');
console.log('HEADLESS:', process.env.HEADLESS);
console.log('BROWSER_HEADLESS:', process.env.BROWSER_HEADLESS);
console.log('');

console.log('========== 测试 headless 参数处理 ==========');

// 模拟前端发送的不同情况
const testCases = [
    { body: { headless: true }, desc: '前端发送 headless: true' },
    { body: { headless: false }, desc: '前端发送 headless: false' },
    { body: {}, desc: '前端未发送 headless' },
    { body: { headless: undefined }, desc: '前端发送 headless: undefined' }
];

testCases.forEach((test) => {
    const body = test.body;
    // 旧的逻辑（有问题）
    const oldHeadless = body.headless !== undefined ? body.headless : undefined;
    // 新的逻辑（修复后）
    const newHeadless = body.headless === true ? true : (body.headless === false ? false : undefined);
    
    console.log(`\n${test.desc}:`);
    console.log(`  旧逻辑结果: ${oldHeadless} (类型: ${typeof oldHeadless})`);
    console.log(`  新逻辑结果: ${newHeadless} (类型: ${typeof newHeadless})`);
    
    // 模拟 getHeadlessMode() 的默认值逻辑
    const headlessEnv = process.env.HEADLESS || process.env.BROWSER_HEADLESS;
    let finalValue;
    if (newHeadless !== undefined) {
        finalValue = newHeadless;
    } else if (headlessEnv) {
        finalValue = headlessEnv.toLowerCase() === 'true' || headlessEnv === '1';
    } else {
        finalValue = false;
    }
    console.log(`  最终使用值: ${finalValue}`);
});

console.log('\n========== 结论 ==========');
if (process.env.HEADLESS || process.env.BROWSER_HEADLESS) {
    console.log('⚠️  发现环境变量设置！');
    console.log('   当前环境变量会覆盖前端传递的 undefined 值');
    console.log('   建议清除环境变量或在前端明确传递 true/false');
} else {
    console.log('✓  未发现环境变量设置');
    console.log('   参数应该能正常工作');
}
