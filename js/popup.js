const $switch = document.querySelector('.switch-open');
const $inputFake = document.querySelector('.input-fake');
const $statusTip = document.querySelector('.status-tip');
const $about = document.querySelector('.about');
const $rewardBtn = document.querySelector('.btn-reward');
const $rewardModal = document.getElementById('reward-modal');
const $rewardClose = document.querySelector('.reward-close');

function displayFakeUrl(stored) {
  return isBuiltinFake(stored) ? '' : stored;
}

function setSwitchUI(on) {
  $switch.classList.toggle('switch-on', on);
  $switch.setAttribute('aria-checked', on ? 'true' : 'false');
  if ($statusTip) {
    $statusTip.textContent = on
      ? '已开启 · 所有网页标签生效中'
      : '开启后对所有网页标签生效';
    $statusTip.classList.toggle('status-on', on);
  }
}

function openRewardModal() {
  $rewardModal.hidden = false;
}

function closeRewardModal() {
  $rewardModal.hidden = true;
}

async function setGlobalMode(enabled, fakeUrl) {
  const normalized = normalizeStoredFakeUrl(fakeUrl);
  await chrome.storage.local.set({
    [ENABLED_KEY]: enabled,
    [FAKE_URL_KEY]: normalized
  });
  try {
    await chrome.runtime.sendMessage({ method: 'broadcast' });
  } catch (_) {}
}

async function init() {
  const stored = await chrome.storage.local.get([ENABLED_KEY, FAKE_URL_KEY]);
  let url = normalizeStoredFakeUrl(stored[FAKE_URL_KEY]);
  $inputFake.value = displayFakeUrl(url);

  if (isBuiltinFake(stored[FAKE_URL_KEY])) {
    await chrome.storage.local.set({ [FAKE_URL_KEY]: BUILTIN_BAIDU });
  }

  setSwitchUI(Boolean(stored[ENABLED_KEY]));

  $switch.addEventListener('click', async () => {
    const turningOn = !$switch.classList.contains('switch-on');

    if (!turningOn) {
      setSwitchUI(false);
      await setGlobalMode(false, url);
      return;
    }

    const inputUrl = $inputFake.value.trim();
    if (!isAllowedFakeUrl(inputUrl)) {
      $inputFake.classList.add('input-tip');
      return;
    }

    url = inputUrl ? normalizeStoredFakeUrl(inputUrl) : BUILTIN_BAIDU;
    setSwitchUI(true);
    await setGlobalMode(true, url);
    setTimeout(() => window.close(), 350);
  });

  $inputFake.addEventListener('blur', () => {
    if ($inputFake.classList.contains('input-tip')) {
      $inputFake.classList.remove('input-tip');
    }
  });

  $about.addEventListener('click', () => {
    window.open('https://github.com/peal-L/prevent-boss-for-browser');
  });

  $rewardBtn.addEventListener('click', openRewardModal);
  $rewardClose.addEventListener('click', closeRewardModal);
  $rewardModal.addEventListener('click', (e) => {
    if (e.target === $rewardModal) closeRewardModal();
  });
}

init();
