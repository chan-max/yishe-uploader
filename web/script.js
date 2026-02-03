const { createApp, reactive, computed, ref, nextTick } = Vue;

const API_BASE = '';

createApp({
    setup() {
        const browserConnecting = ref(false);
        const portChecking = ref(false);
        const defaultUserDataDir = (() => {
            // Windows: 给一个“可直接用”的默认目录，避免默认 Profile 导致端口起不来
            const isWin = navigator.userAgent?.toLowerCase?.().includes('windows');
            return isWin ? 'C:\\temp\\yishe-uploader-cdp-1s' : '/tmp/yishe-uploader-cdp-1s';
        })();
        const state = reactive({
            status: { message: '', type: 'info' },
            browserStatus: null,
            browserConfig: {
                cdpUserDataDir: defaultUserDataDir,
                cdpPort: 9222
            }
        });

        function getCdpPort() {
            const p = parseInt(state.browserConfig.cdpPort, 10);
            return (p > 0 && p < 65536) ? p : 9222;
        }

        const lastActivityText = computed(() => {
            const ts = state.browserStatus?.lastActivity;
            if (!ts) return '-';
            try {
                return new Date(ts).toLocaleString();
            } catch {
                return String(ts);
            }
        });

        function setStatus(message, type = 'info') {
            state.status.message = message;
            state.status.type = type;
        }

        async function refreshBrowserStatus() {
            try {
                const res = await fetch(`${API_BASE}/api/browser/status`);
                const data = await res.json();
                if (!res.ok || !data.success) throw new Error(data.message || '获取状态失败');
                state.browserStatus = data.data;
            } catch (e) {
                // 不打断 UI，仅提示
                console.error('[browser-status] error', e);
                setStatus(e.message || '获取浏览器状态失败', 'error');
            }
        }

        async function launchAndConnect() {
            if (window.location.protocol === 'file:') {
                setStatus('请先通过 http://localhost:7010 打开此页面（运行 npm start）', 'error');
                return;
            }
            browserConnecting.value = true;
            setStatus('正在启动 Chrome（带调试端口）...', 'info');
            await nextTick();
            try {
                const port = getCdpPort();
                const userDataDir = (state.browserConfig.cdpUserDataDir || '').trim();
                const launchRes = await fetch(`${API_BASE}/api/browser/launch-with-debug`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ port, userDataDir })
                });
                const launchData = await launchRes.json();
                if (!launchRes.ok || !launchData.success) throw new Error(launchData.message || '启动失败');
                setStatus('Chrome 已启动，等待 8 秒后连接（若失败会自动重试）...', 'info');
                await new Promise(r => setTimeout(r, 8000));
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), 30000);
                const connectRes = await fetch(`${API_BASE}/api/browser/connect`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mode: 'cdp', cdpEndpoint: `http://127.0.0.1:${port}` }),
                    signal: controller.signal
                });
                clearTimeout(timer);
                const connectData = await connectRes.json();
                if (!connectRes.ok || !connectData.success) throw new Error(connectData.message || '连接失败');
                state.browserStatus = connectData.data;
                setStatus('浏览器已连接', 'success');
            } catch (e) {
                console.error('[launch-and-connect] error', e);
                const msg = e?.name === 'AbortError' ? '连接超时' : (e.message || '启动并连接失败');
                setStatus(msg, 'error');
            } finally {
                browserConnecting.value = false;
            }
        }

        async function checkPort() {
            if (window.location.protocol === 'file:') {
                setStatus('请先通过 http://localhost:7010 打开此页面', 'error');
                return;
            }
            portChecking.value = true;
            setStatus('正在检测端口...', 'info');
            try {
                const port = getCdpPort();
                const res = await fetch(`${API_BASE}/api/browser/check-port`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ port })
                });
                const data = await res.json();
                if (!res.ok || !data.success) throw new Error(data.message || '检测失败');
                const d = data.data;
                if (d.ok) {
                    setStatus(`端口 ${d.port} 已开放，Chrome 调试服务正常。${d.browser ? ' 版本: ' + d.browser : ''}`, 'success');
                } else {
                    setStatus(`端口 ${d.port} 未开放：${d.error || '无响应'}。可尝试：先点「连接」启动 Chrome；或改端口 9223/9224；或确认 user-data-dir 有写权限。`, 'error');
                }
            } catch (e) {
                console.error('[check-port] error', e);
                setStatus(e.message || '检测端口失败', 'error');
            } finally {
                portChecking.value = false;
            }
        }

        async function closeBrowser() {
            browserConnecting.value = true;
            setStatus('正在断开浏览器...', 'info');
            try {
                const res = await fetch(`${API_BASE}/api/browser/close`, { method: 'POST' });
                const data = await res.json();
                if (!res.ok || !data.success) throw new Error(data.message || '断开失败');
                state.browserStatus = data.data;
                setStatus('浏览器已断开', 'success');
            } catch (e) {
                console.error('[browser-close] error', e);
                setStatus(e.message || '断开浏览器失败', 'error');
            } finally {
                browserConnecting.value = false;
            }
        }

        // initial
        if (window.location.protocol === 'file:') {
            setStatus('请通过 http://localhost:7010 打开此页面（先运行 npm start）', 'error');
        } else {
            refreshBrowserStatus();
        }

        // 轮询刷新连接状态（仅当非 file 协议时）
        setInterval(() => {
            if (window.location.protocol !== 'file:') {
                refreshBrowserStatus();
            }
        }, 2000);

        return {
            browserConnecting,
            portChecking,
            ...Vue.toRefs(state),
            lastActivityText,
            setStatus,
            refreshBrowserStatus,
            checkPort,
            launchAndConnect,
            closeBrowser
        };
    }
}).mount('#app');
