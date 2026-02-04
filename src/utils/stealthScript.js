/**
 * 增强型反检测脚本
 * 参考 puppeteer-extra-plugin-stealth 和 social-auto-upload 的实现
 */

export const stealthScript = `
// ===== 1. WebDriver 隐藏 =====
delete Object.getPrototypeOf(navigator).webdriver;
Object.defineProperty(navigator, 'webdriver', {
  get: () => undefined,
  configurable: true
});

// ===== 2. Chrome Runtime =====
window.chrome = {
  runtime: {
    OnInstalledReason: {
      CHROME_UPDATE: 'chrome_update',
      INSTALL: 'install',
      SHARED_MODULE_UPDATE: 'shared_module_update',
      UPDATE: 'update'
    },
    OnRestartRequiredReason: {
      APP_UPDATE: 'app_update',
      OS_UPDATE: 'os_update',
      PERIODIC: 'periodic'
    },
    PlatformArch: {
      ARM: 'arm',
      ARM64: 'arm64',
      MIPS: 'mips',
      MIPS64: 'mips64',
      X86_32: 'x86-32',
      X86_64: 'x86-64'
    },
    PlatformNaclArch: {
      ARM: 'arm',
      MIPS: 'mips',
      MIPS64: 'mips64',
      X86_32: 'x86-32',
      X86_64: 'x86-64'
    },
    PlatformOs: {
      ANDROID: 'android',
      CROS: 'cros',
      LINUX: 'linux',
      MAC: 'mac',
      OPENBSD: 'openbsd',
      WIN: 'win'
    },
    RequestUpdateCheckStatus: {
      NO_UPDATE: 'no_update',
      THROTTLED: 'throttled',
      UPDATE_AVAILABLE: 'update_available'
    }
  },
  loadTimes: function() {},
  csi: function() {},
  app: {}
};

// ===== 3. Permissions =====
const originalQuery = window.navigator.permissions.query;
window.navigator.permissions.query = (parameters) => (
  parameters.name === 'notifications' ?
    Promise.resolve({ state: Notification.permission }) :
    originalQuery(parameters)
);

// ===== 4. Plugins =====
Object.defineProperty(navigator, 'plugins', {
  get: () => [
    {
      0: { type: 'application/x-google-chrome-pdf', suffixes: 'pdf', description: 'Portable Document Format', enabledPlugin: Plugin },
      description: 'Portable Document Format',
      filename: 'internal-pdf-viewer',
      length: 1,
      name: 'Chrome PDF Plugin'
    },
    {
      0: { type: 'application/pdf', suffixes: 'pdf', description: '', enabledPlugin: Plugin },
      description: '',
      filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai',
      length: 1,
      name: 'Chrome PDF Viewer'
    },
    {
      0: { type: 'application/x-nacl', suffixes: '', description: 'Native Client Executable', enabledPlugin: Plugin },
      1: { type: 'application/x-pnacl', suffixes: '', description: 'Portable Native Client Executable', enabledPlugin: Plugin },
      description: '',
      filename: 'internal-nacl-plugin',
      length: 2,
      name: 'Native Client'
    }
  ]
});

// ===== 5. Languages =====
Object.defineProperty(navigator, 'languages', {
  get: () => ['zh-CN', 'zh', 'en-US', 'en']
});

// ===== 6. Platform =====
Object.defineProperty(navigator, 'platform', {
  get: () => 'Win32'
});

// ===== 7. Hardware Concurrency =====
Object.defineProperty(navigator, 'hardwareConcurrency', {
  get: () => 8
});

// ===== 8. Device Memory =====
Object.defineProperty(navigator, 'deviceMemory', {
  get: () => 8
});

// ===== 9. User Agent =====
Object.defineProperty(navigator, 'userAgent', {
  get: () => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
});

// ===== 10. Vendor =====
Object.defineProperty(navigator, 'vendor', {
  get: () => 'Google Inc.'
});

// ===== 11. Connection =====
Object.defineProperty(navigator, 'connection', {
  get: () => ({
    effectiveType: '4g',
    rtt: 50,
    downlink: 10,
    saveData: false,
    onchange: null
  })
});

// ===== 12. Media Devices =====
if (navigator.mediaDevices) {
  const originalEnumerateDevices = navigator.mediaDevices.enumerateDevices;
  navigator.mediaDevices.enumerateDevices = () => {
    return originalEnumerateDevices().then(devices => {
      return devices.length > 0 ? devices : [
        { deviceId: 'default', kind: 'audioinput', label: '', groupId: 'default' },
        { deviceId: 'default', kind: 'audiooutput', label: '', groupId: 'default' },
        { deviceId: 'default', kind: 'videoinput', label: '', groupId: 'default' }
      ];
    });
  };
}

// ===== 13. Battery =====
if (navigator.getBattery) {
  const originalGetBattery = navigator.getBattery;
  navigator.getBattery = () => {
    return originalGetBattery().then(battery => {
      Object.defineProperty(battery, 'charging', { value: true });
      Object.defineProperty(battery, 'chargingTime', { value: 0 });
      Object.defineProperty(battery, 'dischargingTime', { value: Infinity });
      Object.defineProperty(battery, 'level', { value: 1.0 });
      return battery;
    });
  };
}

// ===== 14. Canvas Fingerprint Protection =====
const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
HTMLCanvasElement.prototype.toDataURL = function(type) {
  if (type === 'image/png' && this.width === 0 && this.height === 0) {
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  }
  return originalToDataURL.apply(this, arguments);
};

// ===== 15. WebGL Vendor Info =====
const getParameter = WebGLRenderingContext.prototype.getParameter;
WebGLRenderingContext.prototype.getParameter = function(parameter) {
  if (parameter === 37445) {
    return 'Intel Inc.';
  }
  if (parameter === 37446) {
    return 'Intel Iris OpenGL Engine';
  }
  return getParameter.apply(this, arguments);
};

// ===== 16. Notification Permission =====
if (Notification && Notification.permission === 'default') {
  Object.defineProperty(Notification, 'permission', {
    get: () => 'default'
  });
}

// ===== 17. Screen =====
Object.defineProperty(screen, 'colorDepth', {
  get: () => 24
});
Object.defineProperty(screen, 'pixelDepth', {
  get: () => 24
});

// ===== 18. Date.prototype.getTimezoneOffset =====
const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
Date.prototype.getTimezoneOffset = function() {
  return -480; // UTC+8 (中国时区)
};

// ===== 19. Intl.DateTimeFormat =====
if (Intl && Intl.DateTimeFormat) {
  const originalResolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;
  Intl.DateTimeFormat.prototype.resolvedOptions = function() {
    const options = originalResolvedOptions.call(this);
    options.timeZone = 'Asia/Shanghai';
    return options;
  };
}

// ===== 20. Console Debug Protection =====
const originalConsoleDebug = console.debug;
console.debug = function() {
  // 静默处理某些调试信息
  if (arguments[0] && typeof arguments[0] === 'string' && arguments[0].includes('DevTools')) {
    return;
  }
  return originalConsoleDebug.apply(this, arguments);
};
`;
