import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import * as domain from '../src/domain/profile-stats.mjs';

const source = fs.readFileSync(new URL('../src/features/social/profile-stats.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });

function loadFeature(rpc) {
  const api = {};
  new Function('require', 'exports', outputText)((name) => {
    if (name.includes('supabase')) return { requireSupabase: () => ({ rpc }) };
    if (name.includes('domain/profile-stats')) return domain;
    return {};
  }, api);
  return api;
}

test('profile stats keep the TikTok/Instagram trio: ratings, friends, likes — no followers', () => {
  assert.deepEqual(domain.PROFILE_STATS.map((s) => s.id), ['ratings', 'friends', 'likes']);
  assert.deepEqual(domain.PROFILE_STATS.map((s) => s.label), ['Avaliações', 'Amigos', 'Curtidas']);
});

test('stat counts are exact below one thousand, then compact in Portuguese', () => {
  assert.equal(domain.formatStatCount(0), '0');
  assert.equal(domain.formatStatCount(7), '7');
  assert.equal(domain.formatStatCount(999), '999');
  assert.equal(domain.formatStatCount(1000), '1 mil');
  assert.equal(domain.formatStatCount(1234), '1,2 mil');
  assert.equal(domain.formatStatCount(1299), '1,3 mil');
  assert.equal(domain.formatStatCount(12500), '12,5 mil');
  assert.equal(domain.formatStatCount(999999), '1 mi');
  assert.equal(domain.formatStatCount(2345678), '2,3 mi');
  assert.equal(domain.formatStatCount(-5), '0');
  assert.equal(domain.formatStatCount('abc'), '0');
});

test('missing RPC is detected without inventing numbers', () => {
  assert.ok(domain.isMissingFunctionError({ code: 'PGRST202', message: 'Could not find the function public.profile_stats(profile_id) in the schema cache' }));
  assert.ok(domain.isMissingFunctionError({ code: '42883', message: 'function public.profile_stats(uuid) does not exist' }));
  assert.ok(!domain.isMissingFunctionError({ code: '23505', message: 'duplicate key' }));
  assert.ok(!domain.isMissingFunctionError(null));
});

test('feature returns null and flags unavailable while the migration is not applied', async () => {
  const feature = loadFeature(async () => ({ data: null, error: { code: 'PGRST202', message: 'Could not find the function public.profile_stats(profile_id) in the schema cache' } }));
  assert.equal(await feature.fetchProfileStats('someone'), null);
  assert.ok(feature.profileStatsUnavailable());
  // Chamadas seguintes nem tocam a rede.
  const again = await feature.fetchProfileStats('someone');
  assert.equal(again, null);
});

test('feature passes through real counts and null for blocked profiles', async () => {
  const counts = { ratings: 12, friends: 4, likes: 130 };
  const feature = loadFeature(async (name, args) => {
    assert.equal(name, 'profile_stats');
    return args.profile_id === 'blocked' ? { data: null, error: null } : { data: counts, error: null };
  });
  assert.deepEqual(await feature.fetchProfileStats('someone'), counts);
  assert.equal(await feature.fetchProfileStats('blocked'), null);
  assert.ok(!feature.profileStatsUnavailable());
});

test('unexpected errors propagate instead of showing made-up numbers', async () => {
  const feature = loadFeature(async () => ({ data: null, error: { code: 'XX000', message: 'boom' } }));
  await assert.rejects(() => feature.fetchProfileStats('someone'));
  assert.ok(!feature.profileStatsUnavailable());
});
