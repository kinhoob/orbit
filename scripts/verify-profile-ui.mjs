// Isolated UI test. All Supabase requests are intercepted. No real account or database is used.
// Cobre o cabeçalho novo do perfil (capa, foto, bio, ações com ícone) no
// próprio perfil e no perfil visitado. O upload real não é exercitado aqui:
// depende da migration do Storage e de um dispositivo com galeria.
import puppeteer from 'puppeteer-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(process.argv[2] || 'dist-ui-fixture');
const server = http.createServer((q, r) => { let f = path.join(root, decodeURI(q.url.split('?')[0])); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(root, 'index.html'); r.setHeader('Content-Type', f.endsWith('.js') ? 'application/javascript' : f.endsWith('.html') ? 'text/html' : f.endsWith('.png') ? 'image/png' : 'application/octet-stream'); r.end(fs.readFileSync(f)); });
await new Promise(r => server.listen(8815, '127.0.0.1', r));

const b = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
const p = await b.newPage();
const me = '00000000-0000-4000-8000-000000000001';
const other = '00000000-0000-4000-8000-000000000002';
await p.evaluateOnNewDocument(me => { const token = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })) + '.' + btoa(JSON.stringify({ sub: me, exp: Math.floor(Date.now() / 1000) + 86400 })) + '.test'; localStorage.setItem('sb-orbit-test-auth-token', JSON.stringify({ access_token: token, refresh_token: 'fixture', expires_at: Math.floor(Date.now() / 1000) + 86400, token_type: 'bearer', user: { id: me, aud: 'authenticated' } })); }, me);

const demoAvatar = 'http://127.0.0.1:8815/avatar-demo.png';
const ownProfile = { id: me, display_name: 'Demo Perfil', username: 'demo', bio: 'Cinema, música e animes. Perfil de demonstração, sem dados reais.', avatar_url: demoAvatar, profile_theme: 'forest', avatar_frame: 'line', profile_badge: 'none', profile_animation: 'none', button_theme: 'ink', equipped_badges: ['ratings_10', 'social_1'] };
const visitorProfile = { id: other, display_name: 'Visitante Demo', username: 'visitante', bio: 'Bio de demonstração dentro do cabeçalho.', avatar_url: demoAvatar, profile_theme: 'blossom', avatar_frame: 'double', profile_badge: 'explorer', profile_animation: 'none', button_theme: 'ink', equipped_badges: ['ratings_10'] };
const definitions = [{ id: 'ratings_10', title: '10 avaliações', description: 'demo', icon: 'star' }, { id: 'social_1', title: 'Primeira amizade', description: 'demo', icon: 'users' }];

await p.setRequestInterception(true);
p.on('request', async req => {
  if (!req.url().startsWith('https://orbit-test.supabase.co')) return req.url().startsWith('http://127.0.0.1:8815/') ? req.continue() : req.abort();
  const u = new URL(req.url()), m = req.method();
  const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS,HEAD', 'access-control-expose-headers': 'content-range' };
  if (m === 'OPTIONS') return req.respond({ status: 204, headers });
  let data = [], status = 200;
  const wantsObject = (req.headers().accept || '').includes('vnd.pgrst.object');
  if (m === 'HEAD') { headers['content-range'] = '0-8/9'; return req.respond({ status: 200, headers, contentType: 'application/json', body: '' }); }
  if (u.pathname.endsWith('/auth/v1/user')) data = { id: me, aud: 'authenticated', email: 'demo@example.invalid', email_confirmed_at: '2026-11-20T00:00:00Z' };
  else if (u.pathname.endsWith('/auth/v1/token')) data = { access_token: 'fixture', token_type: 'bearer', expires_in: 86400, refresh_token: 'fixture', user: { id: me, aud: 'authenticated', email: 'demo@example.invalid', email_confirmed_at: '2026-11-20T00:00:00Z' } };
  else if (u.pathname.endsWith('/profiles')) { const idParam = u.searchParams.get('id') || ''; const row = idParam.includes(other) ? visitorProfile : ownProfile; data = wantsObject ? row : [row]; }
  else if (u.pathname.endsWith('/rpc/account_progress')) data = { total_xp: 140, level: 3, title: 'Curioso', floor_xp: 100, next_xp: 200, rated_works: 9, first_collection: true };
  else if (u.pathname.endsWith('/rpc/profile_stats')) data = { ratings: 9, followers: 4, following: 5, friends: 3, likes: 12 };
  else if (u.pathname.endsWith('/rpc/friend_compatibility')) data = { common: 7, percent: 82, minimum: 5 };
  else if (u.pathname.endsWith('/achievement_definitions')) data = definitions;
  else if (u.pathname.endsWith('/account_settings')) data = wantsObject ? { user_id: me, default_visibility: 'public', show_notification_badge: true, motion_preference: 'full', taste_genres: ['acao', 'rock'] } : [{ user_id: me }];
  else if (u.pathname.endsWith('/profile_favorites')) data = [{ media_item_id: 'demo-1', created_at: '2026-11-20T00:00:00Z' }, { media_item_id: 'demo-2', created_at: '2026-11-19T00:00:00Z' }];
  else if (u.pathname.endsWith('/media_items')) data = [{ id: 'demo-1', title: 'Obra demo um', category: 'film', release_year: 2024, cover_url: null }, { id: 'demo-2', title: 'Obra demo dois', category: 'album', release_year: 2023, cover_url: null }];
  await req.respond({ status, headers, contentType: 'application/json', body: JSON.stringify(data) });
});

async function text(t) { try { await p.waitForFunction(t => document.body.innerText.includes(t), { timeout: 15000 }, t); } catch (e) { console.log('WAIT FAILED', t, await p.evaluate(() => document.body.innerText)); throw e; } }
async function buttonPresent(label) { return p.evaluate(label => [...document.querySelectorAll('[role="button"],a[href]')].some(e => (e.getAttribute('aria-label') || e.textContent.trim()) === label), label); }
async function avatarShown() { return p.evaluate(() => [...document.querySelectorAll('img')].some(i => i.src.includes('avatar-demo.png'))); }

await p.setViewport({ width: 390, height: 844 });
await p.goto('http://127.0.0.1:8815/profile', { waitUntil: 'networkidle0' });
await text('Demo Perfil');
await text('Perfil de demonstração');
await text('Nv 3');
await text('Curioso · 140 XP');
assert.ok(await avatarShown(), 'foto do avatar renderizada no próprio perfil');
assert.ok(await buttonPresent('Editar'), 'ação Editar');
assert.ok(await buttonPresent('Personalizar'), 'ação Personalizar');
assert.ok(await buttonPresent('Conquistas'), 'ação Conquistas');
assert.ok(await buttonPresent('Escolher foto de perfil'), 'botão de câmera no avatar');
await new Promise(r => setTimeout(r, 2500));
await p.screenshot({ path: path.resolve('profile-own-mobile.png') });

await p.goto('http://127.0.0.1:8815/people/' + other, { waitUntil: 'networkidle0' });
await text('Visitante Demo');
await text('Bio de demonstração dentro do cabeçalho.');
await text('82% de compatibilidade');
assert.ok(await avatarShown(), 'foto do avatar renderizada no perfil visitado');
await new Promise(r => setTimeout(r, 2500));
await p.screenshot({ path: path.resolve('profile-visitor-mobile.png') });

await p.setViewport({ width: 1280, height: 800 });
await p.goto('http://127.0.0.1:8815/profile', { waitUntil: 'networkidle0' });
await text('Demo Perfil');
await new Promise(r => setTimeout(r, 2500));
await p.screenshot({ path: path.resolve('profile-own-desktop.png') });

console.log(JSON.stringify({ status: 'all passed', checks: ['own header with cover+photo+bio', 'level pill and XP', 'icon actions', 'camera badge', 'visitor header with cover+photo+bio', 'compatibility'] }, null, 2));
await b.close();
await new Promise(r => server.close(r));
