import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPlatformCatalog } from '../src/ecom-collect/platforms/index.js';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_DIR = path.resolve(SCRIPT_DIR, '..');

function parseArgs(argv = []) {
    const result = {
        format: 'markdown',
        platform: '',
        taskType: '',
        output: '',
    };

    for (let index = 0; index < argv.length; index += 1) {
        const current = String(argv[index] || '').trim();
        const next = String(argv[index + 1] || '').trim();

        if ((current === '--format' || current === '-f') && next) {
            result.format = next;
            index += 1;
            continue;
        }
        if (current === '--json') {
            result.format = 'json';
            continue;
        }
        if ((current === '--platform' || current === '-p') && next) {
            result.platform = next;
            index += 1;
            continue;
        }
        if ((current === '--task-type' || current === '-t') && next) {
            result.taskType = next;
            index += 1;
            continue;
        }
        if ((current === '--output' || current === '-o') && next) {
            result.output = next;
            index += 1;
        }
    }

    return result;
}

function normalizeText(value) {
    return String(value || '').trim();
}

function summarizeAccess(access = {}) {
    return [
        access.loginLabel || normalizeText(access.login),
        access.captchaLabel || normalizeText(access.captcha),
        access.antiBotLabel || normalizeText(access.antiBot),
    ].filter(Boolean);
}

function normalizeField(field = {}) {
    return {
        key: normalizeText(field.key),
        label: normalizeText(field.label) || normalizeText(field.key),
        description: normalizeText(field.description),
        valueType: normalizeText(field.valueType),
        stability: normalizeText(field.stability) || 'optional',
        component: normalizeText(field.component),
        required: !!field.required,
        examples: Array.isArray(field.examples) ? field.examples : [],
    };
}

function normalizeTaskField(field = {}) {
    return {
        key: normalizeText(field.key),
        label: normalizeText(field.label) || normalizeText(field.key),
        description: normalizeText(field.description),
        component: normalizeText(field.component) || 'input',
        valueType: normalizeText(field.valueType) || 'string',
        required: !!field.required,
        examples: Array.isArray(field.examples) ? field.examples : [],
    };
}

function dedupeFields(fields = []) {
    return Array.from(
        new Map(
            (Array.isArray(fields) ? fields : [])
                .filter((field) => normalizeText(field?.key))
                .map((field) => [normalizeText(field.key), field]),
        ).values(),
    );
}

function buildTaskUsefulness(taskType = {}) {
    if (!taskType.runnable) {
        return '当前不建议投入生产使用';
    }

    const availability = normalizeText(taskType.availability).toLowerCase();
    const accessText = taskType.access.join(' / ');
    if (availability.includes('可用') && !accessText.includes('验证码') && !accessText.includes('需要登录')) {
        return '适合直接进入稳定回归和业务联调';
    }
    if (availability.includes('启发式') || accessText) {
        return '建议小批量验证后使用，适合人工值守回归';
    }
    return '可用于持续迭代，但需要结合真实环境反复验证';
}

function buildAnalysisReadiness(taskType = {}) {
    const fieldKeys = new Set(
        (Array.isArray(taskType.recordFields) ? taskType.recordFields : [])
            .map((field) => normalizeText(field.key).replace(/\[\]/g, '').toLowerCase())
            .filter(Boolean),
    );
    const hasAny = (...keys) => keys.some((key) => fieldKeys.has(String(key).replace(/\[\]/g, '').toLowerCase()));

    const tags = [
        hasAny('title') ? '商品标题' : '',
        hasAny('imageUrl', 'imageUrls') ? '图片素材' : '',
        hasAny('priceText', 'originalPriceText') ? '价格带' : '',
        hasAny('shopName', 'sellerName') ? '店铺/卖家' : '',
        hasAny('brand') ? '品牌' : '',
        hasAny('ratingText', 'reviewCountText') ? '评分/评论' : '',
        hasAny('descriptionText', 'bulletPoints', 'specPairs', 'detailData') ? '详情文本' : '',
        hasAny('keyword', 'seedKeyword', 'signalType', 'approxTraffic', 'rank', 'newsItems', 'newsTitles') ? '趋势/关键词信号' : '',
    ].filter(Boolean);

    const suggestions = [
        hasAny('title', 'priceText') ? '适合商品初筛、价格带分层和跨平台价格对比' : '',
        hasAny('shopName', 'brand') ? '适合做店铺/品牌分布和头部卖家识别' : '',
        hasAny('descriptionText', 'bulletPoints', 'specPairs', 'detailData') ? '适合做卖点抽取、规格归一化和 AI 摘要' : '',
        hasAny('keyword', 'seedKeyword', 'signalType', 'approxTraffic', 'rank') ? '适合做趋势热词、排序信号和多平台趋势对比' : '',
        hasAny('imageUrl', 'imageUrls') && hasAny('title', 'descriptionText', 'detailData')
            ? '适合做 POD 印花/图案分析，后续可接图案提取、元素拆解与裂变'
            : '',
        hasAny('imageUrl', 'imageUrls') ? '适合做主图理解、相似图聚类和图片素材提取' : '',
    ].filter(Boolean);

    const podReadiness = !taskType.runnable
        ? '当前不建议'
        : hasAny('imageUrl', 'imageUrls') && hasAny('title', 'descriptionText', 'detailData')
            ? '可用于 POD 图案分析输入'
            : hasAny('imageUrl', 'imageUrls')
                ? '仅适合图片初筛'
                : '缺少稳定图片字段';

    return {
        tags,
        suggestions,
        podReadiness,
    };
}

function buildCatalogData(options = {}) {
    const normalizedPlatform = normalizeText(options.platform);
    const normalizedTaskType = normalizeText(options.taskType);

    return getPlatformCatalog()
        .filter((platform) =>
            !normalizedPlatform || platform.value === normalizedPlatform,
        )
        .map((platform) => ({
            platform: platform.value,
            label: platform.label,
            overview: normalizeText(platform.docs?.overview),
            notes: Array.isArray(platform.docs?.notes)
                ? platform.docs.notes.map((item) => normalizeText(item)).filter(Boolean)
                : [],
            status: normalizeText(platform.status),
            statusLabel: normalizeText(platform.statusLabel),
            runnable: platform.runnable !== false,
            reason: normalizeText(platform.reason),
            access: summarizeAccess(platform.access),
            taskTypes: (Array.isArray(platform.taskTypes) ? platform.taskTypes : [])
                .filter((taskType) =>
                    !normalizedTaskType || taskType.value === normalizedTaskType,
                )
                .map((taskType) => ({
                    taskType: taskType.value,
                    label: taskType.label,
                    overview: normalizeText(taskType.docs?.overview),
                    notes: [
                        ...(
                            Array.isArray(taskType.docs?.notes)
                                ? taskType.docs.notes.map((item) => normalizeText(item))
                                : []
                        ),
                        ...(
                            Array.isArray(taskType.access?.notes)
                                ? taskType.access.notes.map((item) => normalizeText(item))
                                : []
                        ),
                    ].filter(Boolean),
                    availability: normalizeText(taskType.availabilityLabel || taskType.availability),
                    verification: normalizeText(taskType.verificationLabel || taskType.verification),
                    runnable: taskType.runnable !== false,
                    reason: normalizeText(taskType.reason),
                    access: summarizeAccess(taskType.access || platform.access),
                    parameterFields: (Array.isArray(taskType.fields)
                        ? taskType.fields
                        : [])
                        .map((field) => normalizeTaskField(field)),
                    recordFields: dedupeFields((Array.isArray(taskType.docs?.recordFields)
                        ? taskType.docs.recordFields
                        : []))
                        .map((field) => normalizeField(field)),
                    packageFields: dedupeFields((Array.isArray(taskType.docs?.packageFields)
                        ? taskType.docs.packageFields
                        : []))
                        .map((field) => normalizeField(field)),
                    examples: (Array.isArray(taskType.docs?.examples)
                        ? taskType.docs.examples
                        : [])
                        .map((item) => ({
                            title: normalizeText(item?.title),
                            description: normalizeText(item?.description),
                        })),
                })),
        }))
        .filter((platform) => platform.taskTypes.length > 0)
        .map((platform) => ({
            ...platform,
            taskTypes: platform.taskTypes.map((taskType) => ({
                ...taskType,
                usefulness: buildTaskUsefulness(taskType),
                analysisReadiness: buildAnalysisReadiness(taskType),
            })),
        }));
}

function formatFieldLine(field) {
    const tags = [
        field.valueType ? `type=${field.valueType}` : '',
        field.stability ? `stability=${field.stability}` : '',
    ].filter(Boolean);
    const suffix = tags.length ? ` (${tags.join(', ')})` : '';
    return `- \`${field.key}\` ${field.label}${suffix}${field.description ? `: ${field.description}` : ''}`;
}

function formatTaskFieldLine(field) {
    const tags = [
        field.component ? `component=${field.component}` : '',
        field.valueType ? `type=${field.valueType}` : '',
        field.required ? 'required' : '',
    ].filter(Boolean);
    const suffix = tags.length ? ` (${tags.join(', ')})` : '';
    return `- \`${field.key}\` ${field.label}${suffix}${field.description ? `: ${field.description}` : ''}`;
}

function toMarkdown(platforms = []) {
    const lines = [
        '# 电商采集平台能力报告',
        '',
        `生成时间：${new Date().toISOString()}`,
        '',
        '> 说明：这里输出的是 capability schema 中声明的“平台功能、参数字段、预期返回字段和可分析方向”。真实运行后，可在 admin 原始数据详情中查看“实际字段目录”和“字段对照”。',
        '',
    ];

    platforms.forEach((platform) => {
        lines.push(`## ${platform.label} (\`${platform.platform}\`)`);
        lines.push('');
        lines.push(`- 状态：${platform.statusLabel || platform.status || '-'}`);
        lines.push(`- 可执行：${platform.runnable ? '是' : '否'}`);
        if (platform.access.length) {
            lines.push(`- 访问限制：${platform.access.join(' / ')}`);
        }
        if (platform.overview) {
            lines.push(`- 平台说明：${platform.overview}`);
        }
        if (platform.reason) {
            lines.push(`- 备注：${platform.reason}`);
        }
        if (platform.notes.length) {
            platform.notes.forEach((note) => {
                lines.push(`- 说明：${note}`);
            });
        }
        lines.push('');

        platform.taskTypes.forEach((taskType) => {
            lines.push(`### ${taskType.label} (\`${taskType.taskType}\`)`);
            lines.push('');
            lines.push(`- 可执行：${taskType.runnable ? '是' : '否'}`);
            if (taskType.availability) {
                lines.push(`- 可用性：${taskType.availability}`);
            }
            if (taskType.verification) {
                lines.push(`- 验证状态：${taskType.verification}`);
            }
            if (taskType.access.length) {
                lines.push(`- 访问限制：${taskType.access.join(' / ')}`);
            }
            if (taskType.reason) {
                lines.push(`- 备注：${taskType.reason}`);
            }
            lines.push(`- 使用建议：${taskType.usefulness}`);
            lines.push(`- POD 图案分析：${taskType.analysisReadiness.podReadiness}`);
            if (taskType.overview) {
                lines.push(`- 功能说明：${taskType.overview}`);
            }
            if (taskType.analysisReadiness.tags.length) {
                lines.push(`- 可分析维度：${taskType.analysisReadiness.tags.join(' / ')}`);
            }
            if (taskType.analysisReadiness.suggestions.length) {
                lines.push(`- 推荐分析：${taskType.analysisReadiness.suggestions.join('；')}`);
            }
            lines.push('');
            lines.push('- 参数字段');
            if (taskType.parameterFields.length) {
                taskType.parameterFields.forEach((field) => {
                    lines.push(formatTaskFieldLine(field));
                });
            } else {
                lines.push('- 暂无声明参数');
            }
            lines.push('');
            lines.push('- `records[]` 字段');
            if (taskType.recordFields.length) {
                taskType.recordFields.forEach((field) => {
                    lines.push(formatFieldLine(field));
                });
            } else {
                lines.push('- 暂无声明字段');
            }
            lines.push('');
            lines.push('- `collectData` 字段');
            if (taskType.packageFields.length) {
                taskType.packageFields.forEach((field) => {
                    lines.push(formatFieldLine(field));
                });
            } else {
                lines.push('- 暂无声明字段');
            }
            lines.push('');
            if (taskType.notes.length) {
                lines.push('- 风控/限制说明');
                taskType.notes.forEach((note) => {
                    lines.push(`- ${note}`);
                });
                lines.push('');
            }
            if (taskType.examples.length) {
                lines.push('- 示例');
                taskType.examples.forEach((example) => {
                    lines.push(
                        `- ${example.title || '示例'}${example.description ? `：${example.description}` : ''}`,
                    );
                });
                lines.push('');
            }
        });
    });

    return `${lines.join('\n').trim()}\n`;
}

async function main() {
    const options = parseArgs(process.argv.slice(2));
    const data = buildCatalogData(options);
    const outputText =
        options.format === 'json'
            ? `${JSON.stringify(data, null, 2)}\n`
            : toMarkdown(data);

    if (options.output) {
        const outputPath = path.isAbsolute(options.output)
            ? options.output
            : path.resolve(REPO_DIR, options.output);
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        await fs.writeFile(outputPath, outputText, 'utf8');
    }

    process.stdout.write(outputText);
}

main().catch((error) => {
    console.error('[ecom-field-catalog] failed', error);
    process.exit(1);
});
