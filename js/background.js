importScripts('fake-url.js');

async function isEnabled() {
  const data = await chrome.storage.local.get(ENABLED_KEY);
  return Boolean(data[ENABLED_KEY]);
}

async function updateBadge(enabled) {
  try {
    await chrome.action.setBadgeText({ text: enabled ? 'ON' : '' });
    await chrome.action.setBadgeBackgroundColor({ color: '#337ab7' });
    await chrome.action.setTitle({
      title: enabled ? '搜索模式已开启' : '准备开始摸鱼了吗？'
    });
  } catch (_) {}
}

async function broadcast(method, payload = {}) {
  const tabs = await chrome.tabs.query({});
  await Promise.all(
    tabs.map(async (tab) => {
      if (!tab.id || !/^https?:/.test(tab.url || '')) return;
      try {
        await chrome.tabs.sendMessage(tab.id, { method, ...payload });
      } catch (_) {}
    })
  );
}

async function broadcastSync() {
  await broadcast('sync');
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  handleMessage(request).then(sendResponse);
  return true;
});

async function handleMessage(request) {
  if (request.method === 'broadcast') {
    await broadcastSync();
    return true;
  }
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes[ENABLED_KEY]) {
    updateBadge(Boolean(changes[ENABLED_KEY].newValue));
  }
  if (changes[ENABLED_KEY] || changes[FAKE_URL_KEY]) {
    broadcastSync();
  }
});

isEnabled().then(updateBadge);
