import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { QueryClient } from '@tanstack/react-query';
import * as domain from '../src/domain/favorites.mjs';

const source = fs.readFileSync(new URL('../src/features/catalog/favorites.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
const api = {};
new Function('require', 'exports', outputText)((name) => {
  if (name.includes('supabase')) return { requireSupabase: () => { throw new Error('Network forbidden in test'); } };
  if (name.includes('domain/favorites')) return domain;
  return {};
}, api);
const key = ['media-state', 'work', 'me'];

test('own profile shows all tabs, other profiles hide the private saved tab', () => {
  const own = domain.profileTabsFor(true).map((tab) => tab.id);
  const other = domain.profileTabsFor(false).map((tab) => tab.id);
  assert.deepEqual(own, ['timeline', 'favorites', 'collections', 'saved']);
  assert.deepEqual(other, ['timeline', 'favorites', 'collections']);
});

test('missing-table detection recognizes PostgREST and PostgreSQL signals only', () => {
  assert.equal(domain.isMissingTableError({ code: '42P01' }), true);
  assert.equal(domain.isMissingTableError({ code: 'PGRST205' }), true);
  assert.equal(domain.isMissingTableError({ message: 'Could not find the table public.profile_favorites' }), true);
  assert.equal(domain.isMissingTableError({ code: '42501', message: 'permission denied' }), false);
  assert.equal(domain.isMissingTableError(null), false);
});

test('favorite toggle feedback is immediate and preserves saved and rating state', async () => {
  const cache = new QueryClient();
  const rating = { score: 9, review: 'draft' };
  cache.setQueryData(key, { saved: true, rating, favorite: false });
  assert.equal(await api.toggleFavorite(cache, 'me', 'work', async (user, id, favorite) => {
    assert.deepEqual([user, id, favorite], ['me', 'work', true]);
    assert.equal(cache.getQueryData(key).favorite, true);
    assert.equal(cache.getQueryData(key).saved, true);
    assert.equal(cache.getQueryData(key).rating, rating);
  }), true);
  cache.clear();
});

test('failed favorite toggle restores previous state and retains newer data', async () => {
  const cache = new QueryClient();
  cache.setQueryData(key, { saved: false, rating: { score: 8 }, favorite: true });
  await assert.rejects(api.toggleFavorite(cache, 'me', 'work', async () => {
    cache.setQueryData(key, { saved: true, rating: { score: 9 }, favorite: false });
    throw new Error('offline');
  }));
  assert.deepEqual(cache.getQueryData(key), { saved: true, rating: { score: 9 }, favorite: true });
  cache.clear();
});

test('repeat taps cannot duplicate favorite requests', async () => {
  const cache = new QueryClient();
  cache.setQueryData(key, { saved: false, rating: null, favorite: false });
  let release;
  const hold = new Promise((resolve) => { release = resolve; });
  let requests = 0;
  const first = api.toggleFavorite(cache, 'me', 'work', async () => { requests++; await hold; });
  assert.equal(await api.toggleFavorite(cache, 'me', 'work', async () => { requests++; }), null);
  release();
  await first;
  assert.equal(requests, 1);
  cache.clear();
});

test('failed favorite toggle after logout never recreates personal cached data', async () => {
  const cache = new QueryClient();
  cache.setQueryData(key, { saved: false, rating: null, favorite: false });
  await assert.rejects(api.toggleFavorite(cache, 'me', 'work', async () => { cache.clear(); throw new Error('denied'); }));
  assert.equal(cache.getQueryData(key), undefined);
});

test('favorites list keeps the most recent marking order', async () => {
  const rows = [{ media_item_id: 'b' }, { media_item_id: 'a' }];
  const items = [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }];
  const client = {
    from: (table) => table === 'profile_favorites'
      ? { select: () => ({ eq: () => ({ order: () => ({ limit: async () => ({ data: rows, error: null }) }) }) }) }
      : { select: () => ({ in: async () => ({ data: items, error: null }) }) },
  };
  const result = await api.listFavoriteItems('me', 60, client);
  assert.deepEqual(result.map((item) => item.id), ['b', 'a']);
});

test('missing favorites table answers empty and marks the feature unavailable', async () => {
  const client = {
    from: () => ({ select: () => ({ eq: () => ({ order: () => ({ limit: async () => ({ data: null, error: { code: '42P01', message: 'relation "public.profile_favorites" does not exist' } }) }) }) }) }),
  };
  assert.deepEqual(await api.listFavoriteItems('me', 60, client), []);
  assert.equal(api.favoritesTableMissing(), true);
});

test('once the table is known missing, listing short-circuits without a client', async () => {
  assert.deepEqual(await api.listFavoriteItems('me', 60, { from: () => { throw new Error('must not be called'); } }), []);
});
