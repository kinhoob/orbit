import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import * as domain from '../src/domain/follows.mjs';
import { isMissingTableError } from '../src/domain/supabase-error.mjs';

const source = fs.readFileSync(new URL('../src/features/social/follows.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });

/** Cliente Supabase falso com encadeamento genérico: qualquer método devolve
 * a própria cadeia, que então resolve a resposta configurada. */
function fakeClient(result) {
  const target = { then: (resolve) => resolve(result) };
  const chain = new Proxy(target, {
    get: (obj, prop) => prop === 'then' ? obj.then : () => chain,
  });
  return { from: () => chain };
}

function loadFeature(result) {
  const api = {};
  new Function('require', 'exports', outputText)((name) => {
    if (name.includes('supabase-error')) return { isMissingTableError };
    if (name.includes('supabase')) return { requireSupabase: () => fakeClient(result) };
    return {};
  }, api);
  return api;
}

test('follow label and toggle keep the unilateral model', () => {
  assert.equal(domain.followLabel(false), 'Seguir');
  assert.equal(domain.followLabel(true), 'Seguindo');
  assert.deepEqual(domain.nextFollow(false), { following: true, delta: 1 });
  assert.deepEqual(domain.nextFollow(true), { following: false, delta: -1 });
});

test('optimistic counts never go below zero', () => {
  assert.equal(domain.adjustFollowCount(0, 1), 1);
  assert.equal(domain.adjustFollowCount(0, -1), 0);
  assert.equal(domain.adjustFollowCount(12, -1), 11);
  assert.equal(domain.adjustFollowCount('abc', 1), 1);
});

test('missing table is detected without inventing state', async () => {
  const feature = loadFeature({ data: null, error: { code: 'PGRST205', message: "Could not find the table 'public.follows' in the schema cache" } });
  assert.equal(await feature.fetchIsFollowing('me', 'other'), null);
  assert.ok(feature.followsUnavailable());
  assert.equal(await feature.setFollow('me', 'other', true), 'unavailable');
});

test('following state and writes pass through when the table exists', async () => {
  const feature = loadFeature({ data: { follower_id: 'me' }, error: null });
  assert.equal(await feature.fetchIsFollowing('me', 'other'), true);
  assert.equal(await feature.setFollow('me', 'other', true), 'ok');
  assert.equal(await feature.setFollow('me', 'other', false), 'ok');
  assert.ok(!feature.followsUnavailable());
});

test('not following yet reads as false', async () => {
  const feature = loadFeature({ data: null, error: null });
  assert.equal(await feature.fetchIsFollowing('me', 'other'), false);
});

test('unexpected errors propagate instead of pretending', async () => {
  const feature = loadFeature({ data: null, error: { code: 'XX000', message: 'boom' } });
  await assert.rejects(() => feature.fetchIsFollowing('me', 'other'));
  assert.ok(!feature.followsUnavailable());
});
