const FAKE_URL_KEY = 'fakeUrl';
const ENABLED_KEY = 'searchModeEnabled';
const BUILTIN_BAIDU = 'builtin:baidu';
const OLD_REMOTE_FAKE =
  'https://common.peal.cc/fakePage/百度一下，你就知道.html';

function isBuiltinFake(url) {
  if (!url || url === BUILTIN_BAIDU) return true;
  if (url === OLD_REMOTE_FAKE) return true;
  try {
    const u = new URL(url);
    return (
      u.protocol === 'chrome-extension:' &&
      u.pathname.endsWith('/fake/baidu.html')
    );
  } catch {
    return false;
  }
}

function resolveFakeUrl(url) {
  if (isBuiltinFake(url)) {
    return chrome.runtime.getURL('fake/baidu.html');
  }
  return url;
}

function normalizeStoredFakeUrl(url) {
  if (isBuiltinFake(url)) return BUILTIN_BAIDU;
  return url;
}

function isAllowedFakeUrl(value) {
  const trimmed = (value || '').trim();
  if (!trimmed || isBuiltinFake(trimmed)) return true;
  try {
    const u = new URL(trimmed);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}
