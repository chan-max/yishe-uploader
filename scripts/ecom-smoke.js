#!/usr/bin/env node

import path from 'path';
import { runEcomCollectTask } from '../src/ecom-collect/ecomCollectService.js';

const DEFAULT_TIMEOUT_MS = 90_000;
const DEFAULT_MAX_ITEMS = 5;
const DEFAULT_SCENARIOS = [
    {
        id: 'google-trends-us',
        platform: 'google_trends',
        collectScene: 'trend_keywords',
        configData: {
            geo: 'US',
            maxItems: DEFAULT_MAX_ITEMS,
        },
    },
    {
        id: 'amazon-suggestions-us',
        platform: 'amazon',
        collectScene: 'search_suggestions',
        configData: {
            marketplace: 'US',
            keyword: 'wireless earbuds',
            maxItems: DEFAULT_MAX_ITEMS,
        },
    },
    {
        id: 'ebay-suggestions-us',
        platform: 'ebay',
        collectScene: 'search_suggestions',
        configData: {
            keyword: 'wireless earbuds',
            maxItems: DEFAULT_MAX_ITEMS,
        },
    },
];

function parseArgs(argv = []) {
    const options = {
        platform: '',
        collectScene: '',
        keyword: '',
        geo: '',
        maxItems: DEFAULT_MAX_ITEMS,
        timeoutMs: DEFAULT_TIMEOUT_MS,
        captureSnapshots: false,
        workspaceDir: '',
        strict: false,
    };

    for (let index = 0; index < argv.length; index += 1) {
        const arg = String(argv[index] || '').trim();
        const next = String(argv[index + 1] || '').trim();

        switch (arg) {
        case '--platform':
            options.platform = next;
            index += 1;
            break;
        case '--scene':
        case '--collect-scene':
            options.collectScene = next;
            index += 1;
            break;
        case '--keyword':
            options.keyword = next;
            index += 1;
            break;
        case '--geo':
            options.geo = next;
            index += 1;
            break;
        case '--max-items':
            options.maxItems = Math.max(1, Math.min(20, Number(next) || DEFAULT_MAX_ITEMS));
            index += 1;
            break;
        case '--timeout-ms':
            options.timeoutMs = Math.max(30_000, Number(next) || DEFAULT_TIMEOUT_MS);
            index += 1;
            break;
        case '--workspace-dir':
            options.workspaceDir = next;
            index += 1;
            break;
        case '--snapshots':
            options.captureSnapshots = true;
            break;
        case '--strict':
            options.strict = true;
            break;
        default:
            break;
        }
    }

    return options;
}

function shouldTreatAsSkipped(result = {}) {
    const status = String(result?.status || '').trim();
    const riskKind = String(result?.data?.summary?.risk?.riskKind || '').trim();
    const message = String(result?.message || '').toLowerCase();

    if (status === 'skipped') {
        return true;
    }

    return ['login_required', 'captcha', 'risk_control'].includes(riskKind)
        || message.includes('已跳过')
        || message.includes('captcha')
        || message.includes('login');
}

function buildScenarioList(options) {
    if (!options.platform || !options.collectScene) {
        return DEFAULT_SCENARIOS.map((item) => ({
            ...item,
            configData: {
                ...item.configData,
                captureSnapshots: options.captureSnapshots,
            },
        }));
    }

    const scenario = {
        id: `${options.platform}-${options.collectScene}`,
        platform: options.platform,
        collectScene: options.collectScene,
        configData: {
            maxItems: options.maxItems,
            captureSnapshots: options.captureSnapshots,
        },
    };

    if (options.keyword) {
        scenario.configData.keyword = options.keyword;
    }
    if (options.geo) {
        scenario.configData.geo = options.geo;
    }

    return [scenario];
}

function summarizeResult(result = {}) {
    return {
        status: result.status,
        message: result.message,
        recordsCount: Array.isArray(result?.data?.records) ? result.data.records.length : 0,
        snapshotsCount: Array.isArray(result?.data?.snapshots) ? result.data.snapshots.length : 0,
        riskKind: result?.data?.summary?.risk?.riskKind || '',
    };
}

async function runScenario(scenario, options) {
    const runId = `${scenario.id}-${Date.now()}`;
    const taskConfig = {
        platform: scenario.platform,
        collectScene: scenario.collectScene,
        timeoutMs: options.timeoutMs,
        workspaceDir: options.workspaceDir || '',
        runId,
        configData: {
            ...scenario.configData,
            captureSnapshots: options.captureSnapshots,
        },
    };

    console.log(`\n[SCENARIO] ${scenario.platform}/${scenario.collectScene}`);
    console.log(JSON.stringify({ runId, configData: taskConfig.configData }, null, 2));

    try {
        const result = await runEcomCollectTask(taskConfig);
        const summary = summarizeResult(result);
        const finalState = result.success
            ? 'passed'
            : shouldTreatAsSkipped(result)
                ? 'skipped'
                : 'failed';

        console.log(JSON.stringify({ finalState, ...summary }, null, 2));

        return {
            id: scenario.id,
            platform: scenario.platform,
            collectScene: scenario.collectScene,
            finalState,
            ...summary,
        };
    } catch (error) {
        const message = error?.message || String(error);
        console.log(JSON.stringify({
            finalState: 'failed',
            status: 'failed',
            message,
            recordsCount: 0,
            snapshotsCount: 0,
            riskKind: '',
        }, null, 2));

        return {
            id: scenario.id,
            platform: scenario.platform,
            collectScene: scenario.collectScene,
            finalState: 'failed',
            status: 'failed',
            message,
            recordsCount: 0,
            snapshotsCount: 0,
            riskKind: '',
        };
    }
}

async function main() {
    const options = parseArgs(process.argv.slice(2));
    const scenarioList = buildScenarioList(options);
    const results = [];

    console.log('[Ecom Smoke] start');
    console.log(JSON.stringify({
        scenarios: scenarioList.map((item) => ({
            id: item.id,
            platform: item.platform,
            collectScene: item.collectScene,
        })),
        captureSnapshots: options.captureSnapshots,
        workspaceDir: options.workspaceDir || null,
        timeoutMs: options.timeoutMs,
        strict: options.strict,
    }, null, 2));

    for (const scenario of scenarioList) {
        const result = await runScenario(scenario, options);
        results.push(result);
    }

    const passCount = results.filter((item) => item.finalState === 'passed').length;
    const skippedCount = results.filter((item) => item.finalState === 'skipped').length;
    const failedCount = results.filter((item) => item.finalState === 'failed').length;

    console.log('\n[Ecom Smoke] summary');
    console.log(JSON.stringify({
        total: results.length,
        passCount,
        skippedCount,
        failedCount,
        results,
    }, null, 2));

    if (failedCount > 0 || (options.strict && passCount === 0)) {
        process.exitCode = 1;
    }
}

main().catch((error) => {
    console.error('[Ecom Smoke] fatal', error);
    process.exit(1);
});
