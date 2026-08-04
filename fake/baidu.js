(function () {
  function stop(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  // 表单提交会跳到百度搜索页，在 iframe 里会被 frame-ancestors 拦截
  const form = document.getElementById('form');
  if (form) {
    form.addEventListener('submit', stop);
    form.setAttribute('action', '#');
  }

  const su = document.getElementById('su');
  if (su) {
    su.addEventListener('click', stop);
  }

  // 同 iframe 内跳转到百度域名会被拦截；新窗口打开保留真实感
  document.addEventListener(
    'click',
    (e) => {
      const a = e.target.closest && e.target.closest('a');
      if (!a) return;
      const href = a.getAttribute('href') || '';
      if (!href || href === '#' || href.startsWith('javascript:')) {
        stop(e);
        return;
      }
      if (a.target === '_blank') return;
      try {
        const u = new URL(a.href, location.href);
        if (u.origin !== location.origin) {
          stop(e);
          window.open(u.href, '_blank', 'noopener,noreferrer');
        }
      } catch (_) {
        stop(e);
      }
    },
    true
  );

  // 没有百度运行时 JS 时，保证热搜区域可见
  const hot = document.getElementById('s-hotsearch-wrapper');
  if (hot) hot.style.display = '';

  const kw = document.getElementById('kw');
  if (kw) {
    kw.removeAttribute('disabled');
    // 占位热词：若为空则给一个中性提示
    if (!kw.placeholder) {
      kw.placeholder = '请输入搜索关键词';
    }
  }

  // 清理可能残留的引导层
  [
    's_new_search_guide',
    's-hotsearch-wrapper-guide',
    'pop-up-container'
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });
})();
