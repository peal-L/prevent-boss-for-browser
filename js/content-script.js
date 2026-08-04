const HIDE_DEBOUNCE_MS = 120;

const state = {
  avElements: [],
  coverStatus: false,
  title: '',
  fakeUrl: '',
  disguise: null,
  iframe: null,
  hideTimer: null,
  disguiseIconDataUri: '',
  onEnter: null,
  onLeave: null,
  onBlur: null,
  onVisibility: null,
  onMouseMove: null,
  metaObserver: null,
  metaTimer: null
};

function getDisguiseMeta(fakeUrl) {
  if (isBuiltinFake(fakeUrl) || /baidu/i.test(fakeUrl || '')) {
    return { title: '百度一下，你就知道' };
  }
  try {
    const u = new URL(fakeUrl);
    return { title: u.hostname || '百度一下，你就知道' };
  } catch {
    return { title: '百度一下，你就知道' };
  }
}

async function ensureDisguiseIconDataUri() {
  if (state.disguiseIconDataUri) return state.disguiseIconDataUri;
  try {
    const res = await fetch(chrome.runtime.getURL('fake/assets/favicon.ico'));
    const blob = await res.blob();
    state.disguiseIconDataUri = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (_) {
    // 极小占位图标（data: 可过大多数站点 CSP）
    state.disguiseIconDataUri =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  }
  return state.disguiseIconDataUri;
}

function setDisguiseFavicon() {
  const href = state.disguiseIconDataUri;
  if (!href || !document.head) return;

  let el = document.getElementById('fish-disguise-icon');
  if (!el) {
    el = document.createElement('link');
    el.id = 'fish-disguise-icon';
    el.rel = 'icon';
    document.head.appendChild(el);
  }
  el.href = href;

  // 暂时拿掉原站 icon，避免和伪装图标抢优先级；恢复时再还原
  document.querySelectorAll('link[rel*="icon"]').forEach((link) => {
    if (link.id === 'fish-disguise-icon') return;
    if (link.dataset.fishPrev === '1') return;
    link.dataset.fishPrev = '1';
    link.dataset.fishHref = link.getAttribute('href') || '';
    link.removeAttribute('href');
  });
}

function restorePageFavicon() {
  document.getElementById('fish-disguise-icon')?.remove();
  document.querySelectorAll('link[rel*="icon"][data-fish-prev="1"]').forEach((link) => {
    if (link.dataset.fishHref) link.setAttribute('href', link.dataset.fishHref);
    delete link.dataset.fishPrev;
    delete link.dataset.fishHref;
  });
}


function onBodyReady(cb) {
  if (document.body) {
    cb();
    return;
  }
  const obs = new MutationObserver(() => {
    if (document.body) {
      obs.disconnect();
      cb();
    }
  });
  obs.observe(document.documentElement, { childList: true });
}

function ensureFakeIframe(url) {
  const resolved = resolveFakeUrl(url);
  if (state.iframe && document.contains(state.iframe)) {
    if (state.iframe.src !== resolved) state.iframe.src = resolved;
    return state.iframe;
  }
  const iframe = document.createElement('iframe');
  iframe.className = 'fish-fake-iframe';
  iframe.src = resolved;
  iframe.setAttribute('title', 'fake');
  document.body.appendChild(iframe);
  state.iframe = iframe;
  return iframe;
}

function ensureSideTip() {
  if (!document.body || document.querySelector('.fish-body-side-tip')) return;
  const tip = document.createElement('div');
  tip.className = 'fish-body-side-tip';
  tip.addEventListener('click', () => disableGlobal());
  document.body.appendChild(tip);
}

function clearHideTimer() {
  if (state.hideTimer) {
    clearTimeout(state.hideTimer);
    state.hideTimer = null;
  }
}

function unbindRevealHandlers() {
  clearHideTimer();
  if (state.onEnter) {
    document.documentElement.removeEventListener('mouseenter', state.onEnter);
    state.onEnter = null;
  }
  if (state.onLeave) {
    document.documentElement.removeEventListener('mouseleave', state.onLeave);
    state.onLeave = null;
  }
  if (state.onBlur) {
    window.removeEventListener('blur', state.onBlur);
    state.onBlur = null;
  }
  if (state.onVisibility) {
    document.removeEventListener('visibilitychange', state.onVisibility);
    state.onVisibility = null;
  }
  if (state.onMouseMove) {
    document.removeEventListener('mousemove', state.onMouseMove, true);
    state.onMouseMove = null;
  }
}

function readPageTitle(disguiseTitle) {
  const el = document.querySelector('head > title');
  const fromEl = el ? el.textContent.trim() : '';
  if (fromEl && fromEl !== disguiseTitle) return fromEl;
  const current = (document.title || '').trim();
  if (current && current !== disguiseTitle) return current;
  return '';
}

function stopWatchRealMeta() {
  if (state.metaObserver) {
    state.metaObserver.disconnect();
    state.metaObserver = null;
  }
  if (state.metaTimer) {
    clearTimeout(state.metaTimer);
    state.metaTimer = null;
  }
}

function watchRealMeta(disguise) {
  stopWatchRealMeta();

  const capture = () => {
    const title = readPageTitle(disguise.title);
    if (title) state.title = title;
  };

  capture();

  if (!document.head) {
    document.addEventListener(
      'DOMContentLoaded',
      () => watchRealMeta(disguise),
      { once: true }
    );
    return;
  }

  state.metaObserver = new MutationObserver(capture);
  state.metaObserver.observe(document.head, {
    childList: true,
    subtree: true,
    characterData: true
  });
  state.metaTimer = setTimeout(stopWatchRealMeta, 5000);
}

function isCoverShowing() {
  return Boolean(document.body?.classList.contains('fish-body-fake-hide'));
}

function showReal() {
  if (!state.coverStatus || !document.body || !isCoverShowing()) return;
  clearHideTimer();

  document.title = state.title || document.title;
  restorePageFavicon();
  document.body.classList.remove('fish-body-fake-hide');

  for (const el of state.avElements) {
    try {
      el.play();
    } catch (_) {}
  }
  state.avElements = [];
}

function showFakeImmediate() {
  if (!state.coverStatus || !document.body || !state.disguise) return;
  clearHideTimer();
  if (isCoverShowing()) {
    document.title = state.disguise.title;
    setDisguiseFavicon();
    return;
  }

  document.title = state.disguise.title;
  setDisguiseFavicon();
  ensureFakeIframe(state.fakeUrl);
  ensureSideTip();
  document.body.classList.add('fish-body-fake-hide');

  state.avElements = [];
  document.querySelectorAll('video, audio').forEach((item) => {
    if (!item.paused) {
      item.pause();
      state.avElements.push(item);
    }
  });
}

function scheduleShowFake() {
  if (!state.coverStatus) return;
  clearHideTimer();
  state.hideTimer = setTimeout(showFakeImmediate, HIDE_DEBOUNCE_MS);
}

function bindRevealHandlers() {
  unbindRevealHandlers();

  // 露真页：只有鼠标真正在页面内活动时
  state.onEnter = () => showReal();
  state.onMouseMove = () => showReal();

  // 盖伪装：失焦 / 切标签 / 鼠标离开窗口；短防抖避免点扩展图标时误闪
  state.onBlur = () => scheduleShowFake();
  state.onVisibility = () => {
    if (document.visibilityState === 'hidden') scheduleShowFake();
  };
  state.onLeave = (e) => {
    if (e && e.relatedTarget) return;
    scheduleShowFake();
  };

  window.addEventListener('blur', state.onBlur);
  document.addEventListener('visibilitychange', state.onVisibility);
  document.documentElement.addEventListener('mouseenter', state.onEnter);
  document.documentElement.addEventListener('mouseleave', state.onLeave);
  document.addEventListener('mousemove', state.onMouseMove, true);
}

function open(url) {
  if (!document.body) {
    onBodyReady(() => open(url));
    return;
  }

  const resolved = resolveFakeUrl(url);

  // 已开启且同地址：复用 iframe，只确保遮罩层与监听还在
  if (state.coverStatus && state.fakeUrl === resolved) {
    ensureFakeIframe(resolved);
    ensureSideTip();
    if (!isCoverShowing() && document.visibilityState === 'hidden') {
      showFakeImmediate();
    }
    return;
  }

  unbindRevealHandlers();
  // 换地址时才重建；否则尽量复用
  if (state.iframe && state.iframe.src !== resolved) {
    state.iframe.remove();
    state.iframe = null;
  }
  document.querySelectorAll('.fish-body-side-tip').forEach((el) => el.remove());
  document.body.classList.remove('fish-body-fake-hide');

  state.coverStatus = true;
  state.fakeUrl = resolved;
  state.disguise = getDisguiseMeta(resolved);

  state.title = readPageTitle(state.disguise.title) || state.title || '';
  watchRealMeta(state.disguise);

  ensureFakeIframe(resolved);
  document.body.classList.add('fish-body-fake-hide');
  document.title = state.disguise.title;
  ensureSideTip();
  bindRevealHandlers();

  ensureDisguiseIconDataUri().then(() => {
    if (state.coverStatus && isCoverShowing()) setDisguiseFavicon();
  });
}

function close() {
  if (!state.coverStatus) return;

  state.coverStatus = false;
  stopWatchRealMeta();
  clearHideTimer();

  document.title = state.title || document.title;
  restorePageFavicon();

  if (document.body) {
    document.body.classList.remove('fish-body-fake-hide');
  }
  unbindRevealHandlers();

  if (state.iframe) {
    state.iframe.remove();
    state.iframe = null;
  }
  document.querySelectorAll('.fish-fake-iframe, .fish-body-side-tip').forEach((el) => el.remove());
  state.avElements = [];
  state.disguise = null;
}

async function disableGlobal() {
  await chrome.storage.local.set({ [ENABLED_KEY]: false });
  close();
}

async function syncFromStorage() {
  const data = await chrome.storage.local.get([ENABLED_KEY, FAKE_URL_KEY]);
  if (data[ENABLED_KEY]) {
    onBodyReady(() => open(resolveFakeUrl(data[FAKE_URL_KEY])));
  } else {
    close();
  }
}

chrome.storage.local.get([ENABLED_KEY, FAKE_URL_KEY], (data) => {
  if (chrome.runtime.lastError || !data[ENABLED_KEY]) {
    return;
  }
  try {
    document.title = getDisguiseMeta(resolveFakeUrl(data[FAKE_URL_KEY])).title;
  } catch (_) {}
  onBodyReady(() => open(resolveFakeUrl(data[FAKE_URL_KEY])));
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes[ENABLED_KEY] || changes[FAKE_URL_KEY]) {
    syncFromStorage();
  }
});

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.method === 'getStatus') {
    sendResponse(state.coverStatus);
    return;
  }
  if (request.method === 'sync') {
    syncFromStorage().then(() => sendResponse(true));
    return true;
  }
});

