import {
  ensureDefaultBrowserProfile,
  getActiveBrowserProfile,
  getBrowserProfile,
  listBrowserProfiles,
  markBrowserProfileUsed,
} from "./BrowserProfileService.js";
import { logger } from "../utils/logger.js";
import {
  getPlaywrightChromium,
  initBundledPlaywrightEnv,
} from "../utils/playwrightRuntime.js";

const sessions = new Map();
const badgeBoundPages = new WeakSet();
const badgeBoundContexts = new WeakSet();

const FOCUS_TRACKER_SCRIPT = `
(() => {
  if (globalThis.__yisheFocusTrackerInstalled) {
    return;
  }

  const ensureState = () => {
    const prev = globalThis.__yisheFocusTracker || {};
    const now = Date.now();
    const next = {
      hasFocus: typeof document?.hasFocus === "function" ? document.hasFocus() : false,
      visibilityState: document?.visibilityState || "unknown",
      lastFocusAt: Number(prev.lastFocusAt || 0),
      lastBlurAt: Number(prev.lastBlurAt || 0),
      lastVisibleAt: Number(prev.lastVisibleAt || 0),
      updatedAt: now
    };

    if (next.hasFocus && !next.lastFocusAt) next.lastFocusAt = now;
    if (next.visibilityState === "visible" && !next.lastVisibleAt) next.lastVisibleAt = now;

    globalThis.__yisheFocusTracker = next;
    return next;
  };

  const updateState = (reason) => {
    const prev = ensureState();
    const now = Date.now();
    const next = {
      ...prev,
      hasFocus: typeof document?.hasFocus === "function" ? document.hasFocus() : false,
      visibilityState: document?.visibilityState || "unknown",
      updatedAt: now,
      lastReason: reason || "update"
    };

    if (reason === "focus" || next.hasFocus) next.lastFocusAt = now;
    if (reason === "blur") next.lastBlurAt = now;
    if (reason === "visible" || next.visibilityState === "visible") next.lastVisibleAt = now;

    globalThis.__yisheFocusTracker = next;
  };

  globalThis.__yisheFocusTrackerInstalled = true;
  ensureState();

  window.addEventListener("focus", () => updateState("focus"), true);
  window.addEventListener("blur", () => updateState("blur"), true);
  document.addEventListener("visibilitychange", () => {
    updateState(document.visibilityState === "visible" ? "visible" : "hidden");
  }, true);
  window.addEventListener("pageshow", () => updateState("pageshow"), true);
  window.addEventListener("load", () => updateState("load"), true);
})();
`;

function injectProfileBadgeScript(payload) {
  const normalizeText = (value, fallback = "") => {
    const normalized = String(value || "").trim();
    return normalized || fallback;
  };

  const profileId = normalizeText(payload?.profileId, "default");
  const profileName = normalizeText(payload?.profileName, profileId);
  const account = normalizeText(payload?.account);
  const platforms = Array.isArray(payload?.platforms)
    ? payload.platforms.map((item) => normalizeText(item)).filter(Boolean)
    : [];
  const titleText = profileName;
  const metaText = [`#${profileId}`, account, platforms.slice(0, 2).join(" / ")]
    .filter(Boolean)
    .join("  ");
  const badgeState = (globalThis.__yisheBrowserAutomationProfileBadgeState =
    globalThis.__yisheBrowserAutomationProfileBadgeState || {});

  badgeState.payload = {
    profileId,
    profileName,
    account,
    platforms,
    titleText,
    metaText,
  };
  globalThis.__yisheBrowserAutomationProfile = badgeState.payload;

  const BADGE_ID = "__yishe_browser_automation_profile_badge";

  const ensureBadge = () => {
    if (!document?.documentElement) {
      return;
    }

    const mountTarget = document.body || document.documentElement;
    if (!mountTarget) {
      return;
    }

    let badge = document.getElementById(BADGE_ID);
    if (!badge) {
      badge = document.createElement("div");
      badge.id = BADGE_ID;
      badge.setAttribute("data-yishe-browser-automation", "profile-badge");
      badge.setAttribute("aria-hidden", "true");
      badge.style.cssText = [
        "position:fixed",
        "top:10px",
        "left:10px",
        "z-index:2147483647",
        "pointer-events:none",
        "display:flex",
        "flex-direction:column",
        "gap:6px",
        "min-width:136px",
        "max-width:min(48vw, 300px)",
        "padding:9px 12px 10px 14px",
        "border-radius:10px",
        "border:2px solid rgba(166, 244, 107, 0.88)",
        "background:linear-gradient(180deg, rgba(14,14,14,0.96), rgba(6,6,6,0.94))",
        "box-shadow:none",
        "overflow:hidden",
        "font-family:Consolas, Monaco, 'Courier New', monospace",
        "line-height:1.28",
        "color:#f8fafc",
        "white-space:normal",
      ].join(";");

      const accent = document.createElement("div");
      accent.setAttribute("data-role", "accent");
      accent.style.cssText = [
        "position:absolute",
        "left:0",
        "top:0",
        "bottom:0",
        "width:4px",
        "background:linear-gradient(180deg, #d9ff75, #3ddc84)",
      ].join(";");

      const header = document.createElement("div");
      header.setAttribute("data-role", "header");
      header.style.cssText = [
        "display:flex",
        "align-items:center",
        "justify-content:space-between",
        "gap:8px",
        "min-width:0",
      ].join(";");

      const flag = document.createElement("div");
      flag.setAttribute("data-role", "flag");
      flag.style.cssText = [
        "display:inline-flex",
        "align-items:center",
        "height:20px",
        "padding:0 8px",
        "border-radius:4px",
        "border:1px solid rgba(166, 244, 107, 0.72)",
        "background:rgba(166, 244, 107, 0.14)",
        "color:#d9ff75",
        "font-size:10px",
        "font-weight:700",
        "letter-spacing:0.08em",
        "line-height:1",
        "text-transform:uppercase",
      ].join(";");
      flag.textContent = "当前环境";

      const idNode = document.createElement("div");
      idNode.setAttribute("data-role", "id");
      idNode.style.cssText = [
        "display:inline-flex",
        "align-items:center",
        "min-height:20px",
        "max-width:52%",
        "padding:0 7px",
        "border-radius:4px",
        "border:1px solid rgba(255,255,255,0.14)",
        "background:rgba(255,255,255,0.06)",
        "color:rgba(255,255,255,0.84)",
        "font-size:10px",
        "font-weight:600",
        "line-height:1",
        "white-space:nowrap",
        "overflow:hidden",
        "text-overflow:ellipsis",
      ].join(";");

      const title = document.createElement("div");
      title.setAttribute("data-role", "title");
      title.style.cssText = [
        "font-size:13px",
        "font-weight:700",
        "color:#ffffff",
        "overflow:hidden",
        "text-overflow:ellipsis",
        "white-space:nowrap",
      ].join(";");

      const meta = document.createElement("div");
      meta.setAttribute("data-role", "meta");
      meta.style.cssText = [
        "font-size:11px",
        "color:rgba(226,232,240,0.9)",
        "overflow:hidden",
        "text-overflow:ellipsis",
        "white-space:nowrap",
      ].join(";");

      header.appendChild(flag);
      header.appendChild(idNode);
      badge.appendChild(accent);
      badge.appendChild(header);
      badge.appendChild(title);
      badge.appendChild(meta);
      mountTarget.appendChild(badge);
    } else if (badge.parentElement !== mountTarget) {
      mountTarget.appendChild(badge);
    }

    const currentPayload = badgeState.payload || {};
    badge.dataset.profileId = currentPayload.profileId || "";
    badge.dataset.profileName = currentPayload.profileName || "";
    badge.title = [currentPayload.profileName, currentPayload.profileId, currentPayload.account]
      .filter(Boolean)
      .join(" | ");

    const titleNode = badge.querySelector('[data-role="title"]');
    const metaNode = badge.querySelector('[data-role="meta"]');
    const idNode = badge.querySelector('[data-role="id"]');
    if (titleNode) {
      titleNode.textContent =
        currentPayload.titleText || currentPayload.profileName || currentPayload.profileId || "";
    }
    if (metaNode) {
      metaNode.textContent = currentPayload.metaText || `#${currentPayload.profileId || "default"}`;
    }
    if (idNode) {
      idNode.textContent = `#${currentPayload.profileId || "default"}`;
    }
  };

  ensureBadge();

  if (!badgeState.bound) {
    badgeState.bound = true;

    const rerender = () => {
      try {
        ensureBadge();
      } catch {
        // ignore
      }
    };

    window.addEventListener("load", rerender, true);
    window.addEventListener("pageshow", rerender, true);
    document.addEventListener("visibilitychange", rerender, true);

    const observer = new MutationObserver(() => {
      const badge = document.getElementById(BADGE_ID);
      if (!badge || !badge.isConnected) {
        rerender();
      }
    });

    try {
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
      badgeState.observer = observer;
    } catch {
      // ignore
    }
  }
}

function getHeadlessMode() {
  const headlessEnv = process.env.HEADLESS || process.env.BROWSER_HEADLESS;
  if (headlessEnv) {
    return headlessEnv.toLowerCase() === "true" || headlessEnv === "1";
  }
  return false;
}

function buildPersistentLaunchOptions({ headless = false }) {
  const launchOptions = {
    headless,
    args: ["--no-first-run", "--no-default-browser-check", ...(headless ? [] : ["--start-maximized"])],
    ignoreHTTPSErrors: true,
  };

  launchOptions.viewport = headless ? { width: 1920, height: 1080 } : null;
  return launchOptions;
}

async function setBrowserWindowMaximized(context, headless = false) {
  if (!context || headless) return;

  let page = context.pages()[0];
  const createdPage = !page;
  if (!page) {
    page = await context.newPage();
  }

  try {
    const cdp = await context.newCDPSession(page);
    const { windowId } = await cdp.send("Browser.getWindowForTarget");
    await cdp.send("Browser.setWindowBounds", {
      windowId,
      bounds: { windowState: "maximized" },
    });
  } catch (error) {
    logger.warn("设置窗口最大化失败（可忽略）:", error?.message || error);
  } finally {
    if (createdPage && page) {
      await page.close().catch(() => {});
    }
  }
}

function createEmptyStatus() {
  return {
    isInitialized: false,
    isConnected: false,
    lastActivity: null,
    pageCount: 0,
  };
}

function resolveProfile(profileId) {
  const normalizedProfileId = String(profileId || "").trim();
  if (normalizedProfileId) {
    const profile = getBrowserProfile(normalizedProfileId);
    if (!profile) {
      throw new Error(`指定环境不存在: ${normalizedProfileId}`);
    }
    return profile;
  }

  const activeProfile = getActiveBrowserProfile() || ensureDefaultBrowserProfile();
  if (!activeProfile) {
    throw new Error("未找到可用执行环境");
  }
  return activeProfile;
}

function getSession(profileId, create = false) {
  const normalizedProfileId = String(profileId || "").trim();
  if (!normalizedProfileId) {
    return null;
  }
  if (!sessions.has(normalizedProfileId) && create) {
    const profile = getBrowserProfile(normalizedProfileId);
    sessions.set(normalizedProfileId, {
      profileId: normalizedProfileId,
      profileName: profile?.name || normalizedProfileId,
      userDataDir: profile?.userDataDir || null,
      contextInstance: null,
      connectPromise: null,
      lastConnectError: null,
      browserVersion: null,
      currentBrowserOptions: {},
      browserStatus: createEmptyStatus(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  return sessions.get(normalizedProfileId) || null;
}

function wrapBrowserHandle(profileId) {
  return {
    profileId,
    newPage: async () => createProfileBrowserPage(profileId),
  };
}

function buildProfileBadgePayload(profile) {
  return {
    profileId: String(profile?.id || "").trim() || "default",
    profileName: String(profile?.name || profile?.id || "").trim() || "default",
    account: String(profile?.account || "").trim() || "",
    platforms: Array.isArray(profile?.platforms) ? profile.platforms : [],
  };
}

async function installProfileBadgeForPage(page, profile) {
  if (!page || (typeof page.isClosed === "function" && page.isClosed())) return;

  try {
    await page.evaluate(injectProfileBadgeScript, buildProfileBadgePayload(profile));
  } catch {
    // 页面导航中、特殊页面或内部页面时忽略
  }
}

function bindProfileBadgePage(page, resolveProfilePayload) {
  if (!page || badgeBoundPages.has(page)) {
    return;
  }

  badgeBoundPages.add(page);
  const syncBadge = () => {
    const profile = resolveProfilePayload();
    if (!profile) return;
    void installProfileBadgeForPage(page, profile);
  };

  page.on("domcontentloaded", syncBadge);
  page.on("load", syncBadge);
}

async function installProfileBadge(context, profile) {
  if (!context || !profile) return;

  const resolveCurrentProfile = () => {
    return getBrowserProfile(profile.id) || profile;
  };

  try {
    for (const page of context.pages()) {
      bindProfileBadgePage(page, resolveCurrentProfile);
      await installProfileBadgeForPage(page, resolveCurrentProfile());
    }

    if (!badgeBoundContexts.has(context)) {
      badgeBoundContexts.add(context);
      context.on("page", (page) => {
        bindProfileBadgePage(page, resolveCurrentProfile);
        void installProfileBadgeForPage(page, resolveCurrentProfile());
      });
    }
  } catch (error) {
    logger.warn("安装环境角标失败:", error?.message || error);
  }
}

async function installFocusTrackerForPage(page) {
  if (!page || (typeof page.isClosed === "function" && page.isClosed())) return;

  try {
    await page.evaluate(FOCUS_TRACKER_SCRIPT);
  } catch {
    // 页面导航中或尚未可执行脚本时忽略
  }
}

async function installFocusTracker(context) {
  if (!context) return;

  try {
    for (const page of context.pages()) {
      await installFocusTrackerForPage(page);
    }

    context.on("page", (page) => {
      void installFocusTrackerForPage(page);
    });
  } catch (error) {
    logger.warn("安装页面焦点跟踪器失败:", error?.message || error);
  }
}

async function getSessionPages(session) {
  if (!session?.contextInstance) {
    return [];
  }

  const pages = session.contextInstance.pages().filter((page) => {
    try {
      return page && !(typeof page.isClosed === "function" && page.isClosed());
    } catch {
      return false;
    }
  });

  const results = await Promise.all(
    pages.map(async (page, index) => {
      let title = "";
      let url = "";
      let isActive = index === 0;
      try {
        title = await page.title().catch(() => "");
        url = page.url();
        isActive = await page
          .evaluate(() => {
            const state = globalThis.__yisheFocusTracker || {};
            return document.visibilityState === "visible" || state.hasFocus === true;
          })
          .catch(() => index === 0);
      } catch {
        // ignore
      }

      return {
        id: `${session.profileId || "default"}-page-${index}`,
        index,
        pageIndex: index,
        title: title || `页面 ${index}`,
        url: url || "",
        type: "page",
        isActive,
        profileId: session.profileId,
        profileName: session.profileName,
      };
    }),
  );

  return results;
}

async function isSessionAvailable(session) {
  if (!session?.contextInstance) {
    return false;
  }

  try {
    const pages = await getSessionPages(session);
    if (!getHeadlessMode() && pages.length === 0) {
      session.browserStatus.isConnected = false;
      session.browserStatus.pageCount = 0;
      return false;
    }

    session.browserStatus.isConnected = true;
    session.browserStatus.pageCount = pages.length;
    session.browserStatus.lastActivity = Date.now();
    session.updatedAt = new Date().toISOString();
    return true;
  } catch (error) {
    session.browserStatus.isConnected = false;
    session.browserStatus.pageCount = 0;
    session.lastConnectError = error?.message || String(error);
    session.updatedAt = new Date().toISOString();
    return false;
  }
}

async function focusSessionWindow(session) {
  if (!session?.contextInstance) {
    throw new Error("浏览器上下文不可用");
  }

  const pages = await getSessionPages(session);
  if (!pages.length) {
    throw new Error("当前环境暂无可聚焦页面");
  }

  const pageEntry =
    pages.find((item) => item.isActive) ||
    pages.find((item) => item.index === 0) ||
    pages[0] ||
    null;
  const page = pageEntry ? await getManagedProfileBrowserPage(session.profileId, pageEntry.index) : null;
  if (!page) {
    throw new Error("未找到可聚焦页面");
  }

  try {
    const cdp = await session.contextInstance.newCDPSession(page);
    const windowStateResponse = await cdp.send("Browser.getWindowForTarget").catch(() => null);
    const windowId = windowStateResponse?.windowId;
    const currentWindowState = String(windowStateResponse?.bounds?.windowState || "").trim();
    if (windowId && (currentWindowState === "minimized" || currentWindowState === "hidden")) {
      await cdp
        .send("Browser.setWindowBounds", {
          windowId,
          bounds: { windowState: "normal" },
        })
        .catch(() => null);
    }
  } catch (error) {
    logger.warn("恢复浏览器窗口状态失败（可忽略）:", error?.message || error);
  }

  await page.bringToFront().catch(() => {});
  await page
    .evaluate(() => {
      try {
        window.focus();
      } catch {
        // ignore
      }
    })
    .catch(() => {});

  session.browserStatus.lastActivity = Date.now();
  session.browserStatus.pageCount = session.contextInstance.pages().length;
  session.updatedAt = new Date().toISOString();

  return {
    focused: true,
    profileId: session.profileId,
    profileName: session.profileName,
    pageIndex: pageEntry?.index ?? 0,
    pageTitle: pageEntry?.title || "",
    pageUrl: pageEntry?.url || "",
  };
}

async function closeSession(session) {
  if (!session) return;

  try {
    if (session.contextInstance) {
      await session.contextInstance.close().catch(() => {});
    }
  } finally {
    session.contextInstance = null;
    session.connectPromise = null;
    session.browserStatus = createEmptyStatus();
    session.browserVersion = null;
    session.updatedAt = new Date().toISOString();
  }
}

export function hasManagedProfileBrowser(profileId) {
  const session = getSession(profileId);
  return !!(session?.contextInstance || session?.connectPromise);
}

export async function getOrCreateManagedProfileBrowser(options = {}) {
  const profile = resolveProfile(options.profileId);
  const session = getSession(profile.id, true);
  const headless =
    typeof options.headless === "boolean" ? options.headless : getHeadlessMode();

  session.profileName = profile.name || profile.id;
  session.userDataDir = profile.userDataDir;
  session.currentBrowserOptions = {
    mode: "bundled",
    profileId: profile.id,
    headless,
  };

  if (session.connectPromise) {
    await session.connectPromise;
    return wrapBrowserHandle(profile.id);
  }

  if (await isSessionAvailable(session)) {
    await installProfileBadge(session.contextInstance, profile);
    return wrapBrowserHandle(profile.id);
  }

  if (session.contextInstance) {
    await closeSession(session);
  }

  session.lastConnectError = null;
  session.connectPromise = (async () => {
    const playwrightRuntime = initBundledPlaywrightEnv();
    const chromium = await getPlaywrightChromium();

    if (playwrightRuntime.browsersPath) {
      logger.info("Playwright browsers path:", playwrightRuntime.browsersPath);
    }

    try {
      session.contextInstance = await chromium.launchPersistentContext(
        profile.userDataDir,
        buildPersistentLaunchOptions({ headless }),
      );
      await setBrowserWindowMaximized(session.contextInstance, headless);
      await installFocusTracker(session.contextInstance);
      await installProfileBadge(session.contextInstance, profile);
      session.browserStatus.isInitialized = true;
      session.browserStatus.isConnected = true;
      session.browserStatus.lastActivity = Date.now();
      session.browserStatus.pageCount = (await getSessionPages(session)).length;
      session.browserVersion =
        (typeof session.contextInstance.browser === "function"
          ? session.contextInstance.browser()?.version?.()
          : "") || null;
      session.updatedAt = new Date().toISOString();
      markBrowserProfileUsed(profile.id, {
        browserVersion: session.browserVersion || "",
        lastUsedAt: session.updatedAt,
      });
    } catch (error) {
      session.lastConnectError = error?.message || String(error);
      await closeSession(session);
      const browsersPathHint = playwrightRuntime.browsersPath
        ? ` 当前浏览器目录: ${playwrightRuntime.browsersPath}.`
        : "";
      const distributionHint = playwrightRuntime.usingBundledPath
        ? "请确认发布包中的 pw-browsers 目录已随程序完整分发。"
        : "请确认 Playwright Chromium 已安装，或显式设置 PLAYWRIGHT_BROWSERS_PATH。";
      throw new Error(
        `启动内置 Chromium 失败。${distributionHint}${browsersPathHint} 请确认 userDataDir 可写。原错误: ${
          error?.message || error
        }`,
      );
    } finally {
      session.connectPromise = null;
    }
  })();

  await session.connectPromise;
  return wrapBrowserHandle(profile.id);
}

export async function isManagedProfileBrowserAvailable(profileId) {
  const targetProfileId = resolveProfile(profileId).id;
  const session = getSession(targetProfileId);
  if (!session) {
    return false;
  }
  return isSessionAvailable(session);
}

export async function listManagedProfileBrowserPages(profileId) {
  const targetProfile = resolveProfile(profileId);
  const session = getSession(targetProfile.id);
  if (!session || !(await isSessionAvailable(session))) {
    return [];
  }
  return getSessionPages(session);
}

export async function getManagedProfileBrowserPage(profileId, pageIndex = 0) {
  const targetProfile = resolveProfile(profileId);
  await getOrCreateManagedProfileBrowser({ profileId: targetProfile.id });
  const session = getSession(targetProfile.id);
  const pages = session?.contextInstance?.pages() || [];
  if (!pages.length) {
    return createProfileBrowserPage(targetProfile.id);
  }
  const index = Number.isInteger(pageIndex) ? pageIndex : 0;
  if (index < 0 || index >= pages.length) {
    throw new Error(`页面索引无效: ${pageIndex}`);
  }
  return pages[index];
}

export async function createProfileBrowserPage(profileId) {
  const targetProfile = resolveProfile(profileId);
  await getOrCreateManagedProfileBrowser({ profileId: targetProfile.id });
  const session = getSession(targetProfile.id);
  if (!session?.contextInstance) {
    throw new Error("浏览器上下文不可用");
  }
  const page = await session.contextInstance.newPage();
  await installFocusTrackerForPage(page);
  await installProfileBadgeForPage(page, targetProfile);
  session.browserStatus.lastActivity = Date.now();
  session.browserStatus.pageCount = session.contextInstance.pages().length;
  session.updatedAt = new Date().toISOString();
  return page;
}

export function updateManagedProfileBrowserActivity(profileId) {
  const targetProfile = resolveProfile(profileId);
  const session = getSession(targetProfile.id);
  if (!session) {
    return;
  }
  session.browserStatus.lastActivity = Date.now();
  session.updatedAt = new Date().toISOString();
}

function buildInstanceSummary(profile, session, pages = []) {
  const hasInstance = !!session?.contextInstance || !!session?.connectPromise;
  const lastActivityValue = session?.browserStatus?.lastActivity || null;
  return {
    profileId: profile.id,
    profileName: profile.name || profile.id,
    userDataDir: profile.userDataDir,
    hasInstance,
    isConnected: !!session?.browserStatus?.isConnected,
    connecting: !!session?.connectPromise,
    pageCount:
      typeof session?.browserStatus?.pageCount === "number"
        ? session.browserStatus.pageCount
        : pages.length,
    lastActivity:
      typeof lastActivityValue === "number"
        ? new Date(lastActivityValue).toISOString()
        : lastActivityValue,
    lastError: session?.lastConnectError || null,
    browserVersion: session?.browserVersion || profile.browserVersion || "",
    connection: {
      mode: "bundled",
      browserName: "chromium",
      browserVersion: session?.browserVersion || profile.browserVersion || "",
      userDataDir: profile.userDataDir,
      profileId: profile.id,
      activeProfileId: listBrowserProfiles().activeProfileId || null,
      activeProfile: getActiveBrowserProfile() || null,
    },
    pages,
    updatedAt: session?.updatedAt || profile.updatedAt || null,
    isActiveProfile: profile.isActive === true,
  };
}

export async function getManagedProfileBrowserStatus(options = {}) {
  const profileState = listBrowserProfiles();
  const profiles = Array.isArray(profileState.items) ? profileState.items : [];
  const normalizedProfileId = String(options.profileId || "").trim();

  if (normalizedProfileId) {
    const profile = getBrowserProfile(normalizedProfileId);
    if (!profile) {
      throw new Error(`指定环境不存在: ${normalizedProfileId}`);
    }
    const session = getSession(normalizedProfileId);
    const pages =
      session && (await isSessionAvailable(session))
        ? await getSessionPages(session)
        : [];
    const instance = buildInstanceSummary(profile, session, pages);
    return {
      ...instance,
      profiles,
      instances: [instance],
      timestamp: new Date().toISOString(),
    };
  }

  const instanceEntries = [];
  for (const profile of profiles) {
    const session = getSession(profile.id);
    const pages =
      session && (await isSessionAvailable(session))
        ? await getSessionPages(session)
        : [];
    instanceEntries.push(buildInstanceSummary(profile, session, pages));
  }

  const connectedInstances = instanceEntries.filter((item) => item.isConnected);
  const primaryInstance =
    instanceEntries.find((item) => item.profileId === profileState.activeProfileId) ||
    connectedInstances[0] ||
    instanceEntries[0] ||
    null;
  const allPages = instanceEntries.flatMap((item) => item.pages || []);
  const lastActivity = instanceEntries
    .map((item) => item.lastActivity)
    .filter(Boolean)
    .sort()
    .reverse()[0] || null;

  return {
    hasInstance: instanceEntries.some((item) => item.hasInstance),
    isConnected: connectedInstances.length > 0,
    pageCount: allPages.length,
    lastActivity,
    lastError:
      instanceEntries.find((item) => item.lastError)?.lastError || null,
    connection: primaryInstance?.connection || {
      mode: "bundled",
      browserName: "chromium",
      browserVersion: "",
      userDataDir: null,
      profileId: null,
      activeProfileId: profileState.activeProfileId || null,
      activeProfile: getActiveBrowserProfile() || null,
    },
    pages: allPages,
    profiles,
    instances: instanceEntries,
    timestamp: new Date().toISOString(),
  };
}

export async function closeManagedProfileBrowser(profileId) {
  const normalizedProfileId = String(profileId || "").trim();
  if (normalizedProfileId) {
    const session = getSession(normalizedProfileId);
    if (session) {
      await closeSession(session);
    }
    return;
  }

  for (const session of sessions.values()) {
    await closeSession(session);
  }
}

export async function focusManagedProfileBrowser(profileId) {
  const targetProfile = resolveProfile(profileId);
  const session = getSession(targetProfile.id);
  if (!session || !(await isSessionAvailable(session))) {
    throw new Error("当前环境浏览器未启动或不可用");
  }

  return await focusSessionWindow(session);
}

export async function checkManagedProfileBrowsers(options = {}) {
  const normalizedProfileId = String(options.profileId || "").trim();
  const reconnect = options.reconnect === true;
  const targets = normalizedProfileId
    ? [resolveProfile(normalizedProfileId).id]
    : Array.from(sessions.keys());

  if (!targets.length) {
    return {
      available: false,
      message: "无浏览器实例",
      status: await getManagedProfileBrowserStatus({ profileId: normalizedProfileId || undefined }),
    };
  }

  let available = false;
  let reconnected = false;
  for (const profileId of targets) {
    const session = getSession(profileId);
    if (!session) {
      continue;
    }
    const ok = await isSessionAvailable(session);
    if (ok) {
      available = true;
      continue;
    }
    if (reconnect) {
      try {
        await getOrCreateManagedProfileBrowser(session.currentBrowserOptions || { profileId });
        available = true;
        reconnected = true;
      } catch (error) {
        session.lastConnectError = error?.message || String(error);
      }
    }
  }

  return {
    available,
    reconnected,
    message: available ? "浏览器可用" : "未发现可用浏览器实例",
    status: await getManagedProfileBrowserStatus({
      profileId: normalizedProfileId || undefined,
    }),
  };
}
