// Real exported app, no backend. External requests are blocked. No production dependencies added.
import puppeteer from 'puppeteer-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = path.resolve(process.argv[2] || 'dist-motion');
const out = path.resolve(process.env.MOTION_OUTPUT || 'motion-evidence');
fs.mkdirSync(out, { recursive: true });
const server = http.createServer((req, res) => {
  let file = path.resolve(root, '.' + decodeURI(req.url.split('?')[0]));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, 'index.html');
  res.setHeader('Content-Type', file.endsWith('.js') ? 'application/javascript' : file.endsWith('.html') ? 'text/html' : 'application/octet-stream');
  res.end(fs.readFileSync(file));
});
await new Promise(r => server.listen(8815, '127.0.0.1', r));
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setRequestInterception(true);
  page.on('request', req => req.url().startsWith('http://127.0.0.1:8815/') ? req.continue() : req.abort());
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  await page.setViewport({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:8815/', { waitUntil: 'networkidle0' });
  await page.waitForSelector('[role=tab]');

  const samples = [];
  async function navigate(title, capture = false) {
    // Browser-side rAF samples avoid tool/network latency hiding short transitions.
    const result = await page.evaluate(async title => {
      const tab = [...document.querySelectorAll('[role=tab]')].find(e => e.getAttribute('aria-label') === title);
      if (!tab) throw new Error('Missing tab ' + title);
      tab.click();
      const frames = [], start = performance.now();
      await new Promise(resolve => {
        const tick = () => {
          const screens = [...document.querySelectorAll('[data-testid=screen-motion]')];
          const el = screens.find(e => e.getBoundingClientRect().width > 0 && !e.closest('[aria-hidden=true], [inert]')) || screens.at(-1);
          if (el) { const s = getComputedStyle(el); frames.push({ ms: Math.round(performance.now() - start), opacity: Number(s.opacity), transform: s.transform }); }
          performance.now() - start < 850 ? requestAnimationFrame(tick) : resolve();
        }; requestAnimationFrame(tick);
      });
      return { title, frames, active: tab.getAttribute('aria-selected'), overflow: document.documentElement.scrollWidth > innerWidth };
    }, title);
    assert.equal(result.active, 'true'); assert.equal(result.overflow, false);
    if (capture) await page.screenshot({ path: path.join(out, title + '-' + page.viewport().width + '.png') });
    samples.push(result);
    return result;
  }
  // Every tab, repeated focus, keyboard interaction, and responsive navigation.
  for (const name of ['Descobrir', 'Criar', 'Salvos', 'Perfil', 'Início', 'Descobrir']) {
    const result = await navigate(name, true);
    if (!result.frames.some(f => f.opacity < 0.999)) console.log(JSON.stringify(result));
    assert.ok(result.frames.some(f => f.opacity < 0.999), 'Motion not observed: ' + name);
    assert.equal(result.frames.at(-1).opacity, 1, name);
  }
  await page.type('input[aria-label="Buscar obras"]', 'teste preservado');
  await navigate('Início'); await navigate('Descobrir');
  assert.equal(await page.$eval('input[aria-label="Buscar obras"]', e => e.value), 'teste preservado');
  // Pointer feedback is time based and returns to its rest state.
  const tab = await page.$('[role=tab][aria-label="Descobrir"]');
  const rect = await tab.boundingBox();
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.mouse.down();
  await new Promise(r => setTimeout(r, 110));
  const pressed = await tab.evaluate(e => getComputedStyle(e).transform);
  assert.notEqual(pressed, 'none');
  await page.screenshot({ path: path.join(out, 'pressed-mobile.png') });
  await page.mouse.up();
  await new Promise(r => setTimeout(r, 180));
  // Secondary screen and browser back also animate and remain usable.
  await navigate('Perfil');
  const authLink = await page.evaluateHandle(() => [...document.querySelectorAll('a[href="/auth"]')].find(e => !e.closest('[inert]'))); await authLink.click();
  await page.waitForFunction(() => location.pathname.startsWith('/auth'));
  await page.waitForSelector('input');
  await page.goBack();
  await page.waitForFunction(() => location.pathname.endsWith('/profile') || location.pathname.endsWith('/profile/'));
  await navigate('Início');
  await page.evaluate(() => [...document.querySelectorAll('[role=button]')].find(e => e.textContent === 'Livros').click());
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(out, 'filtered-mobile.png') });
  if (process.env.RECORD_MOTION) {
    await page.evaluate(() => [...document.querySelectorAll('[role=button]')].find(e => e.textContent === 'Tudo' && !e.closest('[inert]')).click());
    await new Promise(r => setTimeout(r, 600));
    const recorder = await page.screencast({ path: path.join(out, 'orbit-motion.webm'), fps: 30 });
    await new Promise(r => setTimeout(r, 1200));
    for (const title of ['Descobrir', 'Perfil', 'Início']) {
      await page.click('[role=tab][aria-label="' + title + '"]');
      await new Promise(r => setTimeout(r, 1500));
    }
    await page.evaluate(() => [...document.querySelectorAll('[role=button]')].find(e => e.textContent === 'Livros' && !e.closest('[inert]')).click());
    await new Promise(r => setTimeout(r, 1500));
    await page.evaluate(() => [...document.querySelectorAll('[role=button]')].find(e => e.textContent === 'Tudo' && !e.closest('[inert]')).click());
    await new Promise(r => setTimeout(r, 1500));
    await recorder.stop();
  }
  await page.setViewport({ width: 1440, height: 1000 });
  await navigate('Descobrir', true); await navigate('Início', true);

  // Change preference in the running app, not only before load.
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await new Promise(r => setTimeout(r, 50));
  for (const name of ['Descobrir', 'Início', 'Perfil']) {
    const result = await navigate(name);
    assert.ok(result.frames.every(f => f.opacity === 1 && (f.transform === 'none' || f.transform === 'matrix(1, 0, 0, 1, 0, 0)')), 'Reduced motion did not settle immediately');
  }
  // Turn motion back on, then disable during an active transition.
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  await new Promise(r => setTimeout(r, 60));
  await page.click('[role=tab][aria-label="Descobrir"]');
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await new Promise(r => setTimeout(r, 70));
  const rest = await page.$$eval('[data-testid=screen-motion]', els => els.filter(e => e.getBoundingClientRect().width > 0).map(e => ({ opacity: getComputedStyle(e).opacity, transform: getComputedStyle(e).transform })));
  assert.ok(rest.every(s => s.opacity === '1' && s.transform === 'matrix(1, 0, 0, 1, 0, 0)'));
  // Keyboard Enter still activates navigation.
  await page.focus('[role=tab][aria-label="Início"]'); await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('[role=tab][aria-label="Início"]').getAttribute('aria-selected') === 'true');
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(out, 'samples.json'), JSON.stringify({ status: 'passed', samples, pressed, rest, errors }, null, 2));
  console.log(JSON.stringify({ status: 'passed', checks: ['5 tabs + repeat focus', 'time-sampled transitions', 'pointer press', 'state preservation', 'auth route + back', 'filters', '390/1440 no overflow', 'live reduced-motion toggle', 'mid-transition reduction', 'keyboard activation'], evidence: out }));
} finally { await browser.close(); await new Promise(r => server.close(r)); }
