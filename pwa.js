(function () {
  'use strict';
  const banner = document.getElementById('pwa-update');
  const message = document.getElementById('pwa-update-message');
  const install = document.getElementById('ios-install');
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const safari = /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent);
  const standalone = () => navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
  if (install) install.hidden = !(ios && safari && !standalone());
  if (!('serviceWorker' in navigator)) return;

  let registration, dismissed = false, requested = false, reloading = false;
  function offer() {
    if (!registration || !registration.waiting || !navigator.serviceWorker.controller || dismissed) return;
    message.textContent = 'Доступна новая версия ✨';
    banner.hidden = false;
  }
  function watch(worker) {
    if (!worker) return;
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed') offer();
    });
  }
  async function check(returning) {
    if (!registration) return;
    if (returning) dismissed = false;
    offer();
    try { await registration.update(); offer(); } catch (_) { /* Offline: keep the installed shell. */ }
  }
  banner.querySelector('[data-update=later]').addEventListener('click', () => { dismissed = true; banner.hidden = true; });
  banner.querySelector('[data-update=now]').addEventListener('click', async () => {
    if (!registration || !registration.waiting || requested) return;
    document.activeElement?.blur();
    message.textContent = 'Сохраняем данные…';
    try {
      if (window.Asya2?.safety) await window.Asya2.safety();
    } catch (_) {
      message.textContent = 'Не удалось сохранить резервную копию. Скачай её в разделе «Ещё» и попробуй снова.';
      return;
    }
    requested = true;
    window.__asyaPwaUpdating = true;
    message.textContent = 'Обновляем приложение…';
    registration.waiting.postMessage({type: 'SKIP_WAITING'});
  });
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!requested || reloading) return;
    reloading = true;
    location.reload();
  });
  navigator.serviceWorker.register('sw.js', {updateViaCache: 'none'}).then(reg => {
    registration = reg;
    reg.addEventListener('updatefound', () => watch(reg.installing));
    watch(reg.installing);
    offer();
    check(false);
  }).catch(() => { /* Online mode still works when Service Workers are unavailable. */ });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(true); });
  window.addEventListener('pageshow', event => { if (event.persisted) check(true); });
})();
