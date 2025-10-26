// API 基础配置
const API_BASE = '';

// 工具函数
function showLoading(element) {
    element.innerHTML = '正在执行...';
    element.className = 'result-box loading';
}

function showResult(element, data, isSuccess = true) {
    element.innerHTML = data;
    element.className = `result-box ${isSuccess ? 'success' : 'error'}`;
}

function showError(element, error) {
    element.innerHTML = `错误: ${error}`;
    element.className = 'result-box error';
}

// API 调用函数
async function apiCall(endpoint, data = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        return result;
    } catch (error) {
        throw new Error(`网络请求失败: ${error.message}`);
    }
}

// 登录状态检查
document.getElementById('check-login').addEventListener('click', async () => {
    const resultBox = document.getElementById('login-status');
    showLoading(resultBox);
    
    try {
        const result = await apiCall('/api/check-login');
        showResult(resultBox, result.data || result.error, result.success);
    } catch (error) {
        showError(resultBox, error.message);
    }
});

// 同步小红书认证
document.getElementById('sync-xiaohongshu').addEventListener('click', async () => {
    const resultBox = document.getElementById('login-status');
    showLoading(resultBox);
    
    try {
        const result = await apiCall('/api/sync-xiaohongshu');
        showResult(resultBox, result.data || result.error, result.success);
    } catch (error) {
        showError(resultBox, error.message);
    }
});

// 查询产品
document.getElementById('query-product').addEventListener('click', async () => {
    const resultBox = document.getElementById('query-result');
    const env = document.getElementById('query-env').value;
    const productId = document.getElementById('product-id').value.trim();
    const productCode = document.getElementById('product-code').value.trim();
    
    if (!productId && !productCode) {
        showError(resultBox, '请提供产品ID或产品代码');
        return;
    }
    
    showLoading(resultBox);
    
    try {
        const result = await apiCall('/api/query-product', {
            env,
            productId: productId || undefined,
            productCode: productCode || undefined
        });
        showResult(resultBox, result.data || result.error, result.success);
    } catch (error) {
        showError(resultBox, error.message);
    }
});

// 发布产品
document.getElementById('publish-product').addEventListener('click', async () => {
    const resultBox = document.getElementById('publish-result');
    const env = document.getElementById('publish-env').value;
    const productId = document.getElementById('publish-product-id').value.trim();
    const productCode = document.getElementById('publish-product-code').value.trim();
    const platforms = document.getElementById('publish-platforms').value.trim();
    
    if (!productId && !productCode) {
        showError(resultBox, '请提供产品ID或产品代码');
        return;
    }
    
    showLoading(resultBox);
    
    try {
        const result = await apiCall('/api/publish-product', {
            env,
            productId: productId || undefined,
            productCode: productCode || undefined,
            platforms
        });
        showResult(resultBox, result.data || result.error, result.success);
    } catch (error) {
        showError(resultBox, error.message);
    }
});

// 单平台发布
document.querySelectorAll('.btn-platform').forEach(button => {
    button.addEventListener('click', async () => {
        const resultBox = document.getElementById('platform-result');
        const env = document.getElementById('platform-env').value;
        const platform = button.dataset.platform;
        
        showLoading(resultBox);
        
        try {
            const result = await apiCall('/api/publish-platform', {
                platform,
                env
            });
            showResult(resultBox, result.data || result.error, result.success);
        } catch (error) {
            showError(resultBox, error.message);
        }
    });
});

// 批量发布
document.getElementById('publish-all').addEventListener('click', async () => {
    const resultBox = document.getElementById('batch-result');
    const env = document.getElementById('batch-env').value;
    const dataIndex = document.getElementById('data-index').value;
    const platforms = document.getElementById('batch-platforms').value.trim();
    
    showLoading(resultBox);
    
    try {
        const result = await apiCall('/api/publish-all', {
            env,
            dataIndex,
            platforms
        });
        showResult(resultBox, result.data || result.error, result.success);
    } catch (error) {
        showError(resultBox, error.message);
    }
});

// 浏览器管理
document.getElementById('browser-start').addEventListener('click', async () => {
    const resultBox = document.getElementById('browser-result');
    showLoading(resultBox);
    
    try {
        const result = await apiCall('/api/browser', { action: 'start' });
        showResult(resultBox, result.data || result.error, result.success);
    } catch (error) {
        showError(resultBox, error.message);
    }
});

document.getElementById('browser-start-keep').addEventListener('click', async () => {
    const resultBox = document.getElementById('browser-result');
    showLoading(resultBox);
    
    try {
        const result = await apiCall('/api/browser', { action: 'start-keep' });
        showResult(resultBox, result.data || result.error, result.success);
    } catch (error) {
        showError(resultBox, error.message);
    }
});

document.getElementById('browser-status').addEventListener('click', async () => {
    const resultBox = document.getElementById('browser-result');
    showLoading(resultBox);
    
    try {
        const result = await apiCall('/api/browser', { action: 'status' });
        showResult(resultBox, result.data || result.error, result.success);
    } catch (error) {
        showError(resultBox, error.message);
    }
});

document.getElementById('browser-close').addEventListener('click', async () => {
    const resultBox = document.getElementById('browser-result');
    showLoading(resultBox);
    
    try {
        const result = await apiCall('/api/browser', { action: 'close' });
        showResult(resultBox, result.data || result.error, result.success);
    } catch (error) {
        showError(resultBox, error.message);
    }
});

// 从文件发布
document.getElementById('publish-from-file').addEventListener('click', async () => {
    const resultBox = document.getElementById('other-result');
    showLoading(resultBox);
    
    try {
        const result = await apiCall('/api/publish-from-file');
        showResult(resultBox, result.data || result.error, result.success);
    } catch (error) {
        showError(resultBox, error.message);
    }
});

// 页面加载完成后的初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Yishe Uploader 控制台已加载');
    
    // 添加一些交互效果
    document.querySelectorAll('.btn').forEach(button => {
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'translateY(-2px)';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'translateY(0)';
        });
    });
    
    // 自动聚焦到第一个输入框
    const firstInput = document.querySelector('input[type="text"]');
    if (firstInput) {
        firstInput.focus();
    }
});

// 键盘快捷键
document.addEventListener('keydown', (e) => {
    // Ctrl + Enter 快速执行
    if (e.ctrlKey && e.key === 'Enter') {
        const activeElement = document.activeElement;
        if (activeElement && activeElement.tagName === 'INPUT') {
            // 找到最近的按钮并点击
            const card = activeElement.closest('.card');
            if (card) {
                const button = card.querySelector('.btn-primary, .btn-success, .btn-warning');
                if (button) {
                    button.click();
                }
            }
        }
    }
});

// 错误处理
window.addEventListener('error', (e) => {
    console.error('页面错误:', e.error);
});

// 网络状态检测
window.addEventListener('online', () => {
    console.log('网络连接已恢复');
});

window.addEventListener('offline', () => {
    console.log('网络连接已断开');
    alert('网络连接已断开，请检查网络设置');
});
