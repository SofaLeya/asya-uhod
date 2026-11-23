const {test, expect} = require('@playwright/test');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const oldWorker = `const C='asya-moonlight-test-old';self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(['./','index.html'])))});self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));self.addEventListener('fetch',e=>{if(e.request.url.startsWith(self.registration.scope))e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)))});`;

test('Мой уход and silver crown fit mobile headers in both themes', async ({page}) => {
  await page.goto('/');
  await expect(page.locator('header h1')).toHaveText('Мой уход');
  await expect(page.locator('.title-crown')).toHaveAttribute('aria-hidden', 'true');
  await page.locator('.ydsync-badge').evaluate(el => {el.hidden = false; el.textContent = 'Диск подключён'});
  for (const width of [320, 360, 390]) {
    await page.setViewportSize({width, height: 720});
    for (const theme of ['light', 'dark']) {
      await page.evaluate(value => document.documentElement.dataset.theme = value, theme);
      const title = await page.locator('header h1').boundingBox();
      const crown = await page.locator('.title-crown').boundingBox();
      const badge = await page.locator('.ydsync-badge').boundingBox();
      expect(crown.x).toBeGreaterThanOrEqual(title.x + title.width - 1);
      expect(crown.x + crown.width).toBeLessThanOrEqual(badge.x + 1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
  }
});

test('Moonlight progress and the single care switch fit iPhone WebKit', async ({page, browserName}) => {
  test.skip(browserName !== 'webkit', 'Mobile WebKit project');
  await page.goto('/');
  await expect(page.locator('#today-summary #period-cards .hero-period')).toHaveCount(2);
  await expect(page.locator('#care-tabs button')).toHaveCount(2);
  await expect(page.locator('.period-card,#care-complete,[data-switch-other]')).toHaveCount(0);
  for (const width of [320, 360, 390]) {
    await page.setViewportSize({width, height: 720});
    for (const theme of ['light', 'dark']) {
      await page.evaluate(value => document.documentElement.dataset.theme = value, theme);
      const layout = await page.locator('#today-summary').evaluate(hero => {
        const card = hero.getBoundingClientRect();
        const items = [...hero.querySelectorAll('.hero-period')].map(el => el.getBoundingClientRect());
        return {card: {left:card.left,right:card.right}, items:items.map(r => ({left:r.left,right:r.right,top:r.top})), scrollWidth:document.documentElement.scrollWidth};
      });
      expect(layout.items).toHaveLength(2);
      expect(Math.abs(layout.items[0].top - layout.items[1].top)).toBeLessThan(1);
      for (const item of layout.items) {
        expect(item.left).toBeGreaterThanOrEqual(layout.card.left);
        expect(item.right).toBeLessThanOrEqual(layout.card.right);
      }
      expect(layout.scrollWidth).toBeLessThanOrEqual(width);
      await page.locator('#care-tabs [data-period=pm]').click();
      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
      const navTop = await page.locator('.bottom-nav').evaluate(el => el.getBoundingClientRect().top);
      const lastBottom = await page.locator('#all-pm').evaluate(el => el.getBoundingClientRect().bottom);
      expect(lastBottom).toBeLessThanOrEqual(navTop);
    }
  }
});

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
  await page.addInitScript(() => Object.defineProperty(navigator, 'standalone', {get: () => true}));
  await page.reload();
  await page.locator('.bottom-nav [data-tab=more]').click();
  await expect(page.locator('#ios-install')).toBeHidden();
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
    const cacheNames = await page.evaluate(() => caches.keys());
    expect(cacheNames).toContain('asya-moonlight-v5-smart-bag');
    expect(cacheNames).not.toContain('asya-moonlight-test-old');
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

test('Yandex OAuth redirect is handled in the same window without retaining the token in the URL', async ({page}) => {
  await page.route('https://cloud-api.yandex.net/**', route => route.fulfill({status:404}));
  await page.goto('/#access_token=fixture-token&expires_in=3600');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('yds:asya-uhod') || '{}').tok)).toBe('fixture-token');
  expect(new URL(page.url()).hash).toBe('');
  await page.reload();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('yds:asya-uhod') || '{}').tok)).toBe('fixture-token');
});

test('care data and photo survive closing and reopening a WebKit window', async ({page, context, browserName}) => {
  test.skip(browserName !== 'webkit', 'Mobile WebKit project');
  await page.goto('/');
  await page.locator('#care-tabs [data-period=am]').click();
  await page.locator('#am-wash').check();
  await page.evaluate(async () => Asya2.photoPut('reopen-photo', new Blob([new Uint8Array([4, 5, 6])], {type:'image/png'})));
  await page.close();
  const reopened = await context.newPage();
  await reopened.goto('/');
  await reopened.locator('#care-tabs [data-period=am]').click();
  await expect(reopened.locator('#am-wash')).toBeChecked();
  expect(await reopened.evaluate(async () => !!(await Asya2.photoGet('reopen-photo')))).toBe(true);
});
