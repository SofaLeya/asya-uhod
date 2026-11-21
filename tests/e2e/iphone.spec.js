const {test, expect} = require('@playwright/test');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const oldWorker = `const C='asya-moonlight-test-old';self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(['./','index.html'])))});self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));self.addEventListener('fetch',e=>{if(e.request.url.startsWith(self.registration.scope))e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)))});`;

test('iPhone layout, Safari installation guidance and standalone display', async ({page, browserName}) => {
  test.skip(browserName !== 'webkit', 'Mobile WebKit project');
  await page.goto('/');
  await expect(page.locator('#ios-install')).toBeHidden();
  await page.locator('.bottom-nav [data-tab=more]').click();
  await expect(page.locator('#ios-install')).toBeVisible();
  await expect(page.locator('#ios-install li')).toHaveCount(4);
  for (const width of [320, 360, 390]) {
    await page.setViewportSize({width, height: 720});
    for (const tab of ['today', 'more', 'bag']) {
      await page.locator(`.bottom-nav [data-tab=${tab}]`).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      const nav = await page.locator('.bottom-nav').boundingBox();
      expect(nav.y + nav.height).toBeLessThanOrEqual(721);
    }
  }
  await page.locator('.bottom-nav [data-tab=bag]').click();
  expect(await page.locator('#product-search').evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  await page.locator('#product-add').click();
  await expect(page.locator('#product-dialog')).toBeVisible();
  expect(await page.locator('#product-form [name=name]').evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
});

test('PWA offers a waiting version, defers it, then updates without losing data or looping', async ({page, context}) => {
  let newer = false;
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname === '/sw.js') {
      res.writeHead(200, {'Content-Type': 'text/javascript', 'Cache-Control': 'no-store'});
      res.end(newer ? fs.readFileSync(path.join(root, 'sw.js')) : oldWorker);
      return;
    }
    const file = path.join(root, pathname === '/' ? 'index.html' : pathname);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
    const ext = path.extname(file);
    const type = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.webmanifest':'application/manifest+json', '.png':'image/png', '.svg':'image/svg+xml'}[ext] || 'application/octet-stream';
    res.writeHead(200, {'Content-Type':type, 'Cache-Control':'no-store'});
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
    let navigationCount = 0;
    page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigationCount++; });
    await page.goto(origin);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await expect(page.locator('#pwa-update')).toBeHidden();
    await page.locator('#care-tabs [data-period=am]').click();
    await page.locator('#am-wash').check();
    await page.evaluate(async () => {
      await Asya2.photoPut('update-photo', new Blob([new Uint8Array([1, 2, 3])], {type:'image/png'}));
      localStorage.setItem('ananas:diary:2026-11-20', JSON.stringify({s:4, note:'Сохранилось'}));
    });
    newer = true;
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
    await expect(page.locator('#pwa-update')).toBeVisible();
    await expect(page.locator('#pwa-update-message')).toHaveText('Доступна новая версия ✨');
    await page.locator('[data-update=later]').click();
    await expect(page.locator('#pwa-update')).toBeHidden();
    await page.evaluate(() => Asya2.render());
    await expect(page.locator('#pwa-update')).toBeHidden();
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await expect(page.locator('#pwa-update')).toBeVisible();
    const before = navigationCount;
    await page.locator('[data-update=now]').click();
    await expect.poll(() => navigationCount).toBe(before + 1);
    await page.waitForLoadState('load');
    await expect(page.locator('#pwa-update')).toBeHidden();
    expect(await page.evaluate(() => Object.keys(localStorage).some(k => k === 'asya2:safety:restore'))).toBe(true);
    expect(await page.evaluate(() => Object.values(localStorage).some(v => v?.includes('Сохранилось')))).toBe(true);
    expect(await page.evaluate(async () => !!(await Asya2.photoGet('update-photo')))).toBe(true);
    expect(await page.evaluate(() => Array.from(document.querySelectorAll('#ol-am input[type=checkbox]')).some(x => x.id === 'am-wash' && x.checked))).toBe(true);
    expect(await page.evaluate(async () => (await caches.keys()).includes('asya-moonlight-v2'))).toBe(true);
    await page.waitForTimeout(600);
    expect(navigationCount).toBe(before + 1);
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('.bottom-nav [data-tab=today]')).toBeVisible();
  } finally {
    await context.setOffline(false);
    await new Promise(resolve => server.close(resolve));
  }
});
