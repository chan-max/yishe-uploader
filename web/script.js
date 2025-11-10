const { createApp, reactive, computed } = Vue;

const API_BASE = '';
const BACKEND_BASE = {
    dev: 'http://localhost:1520',
    prod: 'https://1s.design:1520'
};

createApp({
    setup() {
        const state = reactive({
            env: 'prod',
            currentView: 'pending', // 'dashboard' | 'pending' | 'login'
            status: { message: '', type: 'info' },
            pendingList: [],
            loginStatus: {},
        });

        const subtitle = computed(() => state.currentView === 'pending'
            ? '查看待发布的商品并快速触发单条发布脚本'
            : state.currentView === 'login' ? '查看并检查各平台登录状态' : '概览');

        const pendingCountDisplay = computed(() => state.pendingList.length || '-');
        const loggedInPlatforms = computed(() => {
            const entries = Object.values(state.loginStatus);
            if (!entries.length) return '-';
            return entries.filter(x => x && x.isLoggedIn).length;
        });

        function setStatus(message, type = 'info') {
            state.status.message = message;
            state.status.type = type;
        }

        function mapItem(raw) {
            return {
                id: raw.id,
                name: raw.name,
                description: raw.description || '',
                images: Array.isArray(raw.images) ? raw.images : [],
                keywords: raw.keywords || '',
                publishStatus: raw.publishStatus
            };
        }

        async function refreshPending() {
            setStatus('正在获取待发布商品...', 'info');
            state.pendingList = [];
            try {
                const backendBase = BACKEND_BASE[state.env] || BACKEND_BASE.prod;
                const res = await fetch(`${backendBase}/api/product/page`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        publishStatus: 'pending_social_media',
                        includeRelations: false,
                        page: 1,
                        pageSize: 1000
                    })
                });
                if (!res.ok) throw new Error(`服务器返回 ${res.status}`);
                const data = await res.json();
                const list = Array.isArray(data?.data?.list)
                    ? data.data.list
                    : Array.isArray(data?.list)
                        ? data.list
                        : Array.isArray(data?.data)
                            ? data.data
                            : [];
                state.pendingList = list.map(mapItem);
                setStatus(`共获取到 ${state.pendingList.length} 条商品`, 'success');
            } catch (e) {
                console.error('[pending] error', e);
                setStatus(e.message || '获取数据失败', 'error');
            }
        }

        async function publishSingle(productId, evt) {
            const btn = evt?.target;
            if (btn) {
                btn.disabled = true;
                btn.textContent = '发布中...';
            }
            try {
                const res = await fetch(`${API_BASE}/api/publish`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ env: state.env, productId })
                });
                const result = await res.json();
                if (!result.success) throw new Error(result.message || '发布失败');
                if (btn) {
                    btn.textContent = '发布成功';
                    btn.classList.add('success');
                }
                setStatus(`商品 ${productId} 发布完成`, 'success');
            } catch (e) {
                console.error('[publish] error', e);
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = '发布';
                }
                setStatus(e.message || '发布失败', 'error');
            }
        }

        async function checkLogin(force = false) {
            setStatus('正在检查平台登录状态...', 'info');
            state.loginStatus = {};
            try {
                const res = await fetch(`${API_BASE}/api/check-login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ force })
                });
                const data = await res.json();
                if (!data.success) throw new Error(data.message || '检查失败');
                state.loginStatus = data.data || {};
                setStatus('登录状态检查完成', 'success');
            } catch (e) {
                console.error('[login] error', e);
                setStatus(e.message || '检查登录状态失败', 'error');
            }
        }

        // initial
        refreshPending();

        return {
            ...Vue.toRefs(state),
            subtitle,
            pendingCountDisplay,
            loggedInPlatforms,
            setStatus,
            refreshPending,
            publishSingle,
            checkLogin
        };
    }
}).mount('#app');
