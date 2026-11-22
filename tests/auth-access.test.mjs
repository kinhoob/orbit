import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { genres } from '../src/features/catalog/genres.mjs';
import { compatibilityKickoff } from '../src/domain/onboarding.mjs';
import { tasteCompleteKey, tasteGateDecision } from '../src/features/auth/gate-state.mjs';

function load(relative, imports = {}) {
  const source = fs.readFileSync(new URL(relative, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.React } });
  const api = {};
  new Function('require', 'exports', outputText)(name => {
    if (!(name in imports)) throw new Error(`Unexpected import: ${name}`);
    return imports[name];
  }, api);
  return api;
}

const { verifySession } = load('../src/features/auth/session-validation.ts');
const candidate = { access_token: 'candidate-token', user: { id: 'me', email: 'person@example.com' } };
const verifiedUser = { ...candidate.user, email_confirmed_at: '2026-11-22T00:00:00Z' };

test('restored session is verified by Auth and uses the server user', async () => {
  const client = { auth: { getUser: async token => { assert.equal(token, candidate.access_token); return { data: { user: verifiedUser }, error: null }; } } };
  const result = await verifySession(client, candidate);
  assert.equal(result.user, verifiedUser);
  assert.notEqual(result, candidate);
});

test('revoked session and network failure do not grant access', async () => {
  for (const error of [new Error('revoked'), new Error('offline')]) {
    await assert.rejects(verifySession({ auth: { getUser: async () => ({ data: { user: null }, error }) } }, candidate), error);
  }
});

test('another account, anonymous user and unconfirmed email cannot validate the candidate', async () => {
  for (const user of [{ ...verifiedUser, id: 'other' }, { ...verifiedUser, is_anonymous: true }, candidate.user, null]) {
    await assert.rejects(verifySession({ auth: { getUser: async () => ({ data: { user }, error: null }) } }, candidate));
  }
});

function onboarding(tables, { storageFails = false } = {}) {
  const calls = [];
  const storage = [];
  const client = { from(table) {
    const response = tables[table]?.shift();
    if (!response) throw new Error(`Unexpected query: ${table}`);
    calls.push(['from', table]);
    const chain = new Proxy({}, { get(_target, key) {
      if (key === 'then') return (resolve, reject) => Promise.resolve(response).then(resolve, reject);
      return (...args) => { calls.push([key, ...args]); return chain; };
    } });
    return chain;
  } };
  const api = load('../src/features/auth/onboarding.ts', {
    '@react-native-async-storage/async-storage': { setItem: async (...args) => { storage.push(args); if (storageFails) throw new Error('storage unavailable'); }, getItem: async () => null },
    '../../lib/supabase': { requireSupabase: () => client },
    '../../domain/onboarding.mjs': { compatibilityKickoff },
    './gate-state.mjs': { tasteCompleteKey },
    '../catalog/genres.mjs': { genres },
  });
  return { api, calls, storage };
}

function account(count = 5) {
  return { profiles: [{ data: { id: 'me' }, error: null }], account_settings: [{ data: null, error: null }], ratings: [{ count, error: null }] };
}

test('account validation requires an owned profile, accessible settings and the server rating count', async () => {
  const { api, calls } = onboarding(account(4));
  assert.equal(await api.needsTasteOnboarding('me'), true);
  assert.equal(calls.filter(call => call[0] === 'eq' && call[2] === 'me').length, 3);
});

test('missing profile, denied settings and unavailable count never mark onboarding complete', async () => {
  for (const change of [tables => { tables.profiles[0].data = null; }, tables => { tables.account_settings[0].error = new Error('denied'); }, tables => { tables.ratings[0].count = null; }]) {
    const tables = account(); change(tables);
    const { api, storage } = onboarding(tables);
    await assert.rejects(api.needsTasteOnboarding('me'));
    assert.equal(storage.length, 0);
  }
});

test('authoritative completion survives a device storage failure', async () => {
  const { api } = onboarding(account(5), { storageFails: true });
  assert.equal(await api.needsTasteOnboarding('me'), false);
});

test('taste preferences come from the account row and discard unknown genre ids', async () => {
  const id = genres[0].id;
  const { api, calls } = onboarding({ account_settings: [{ data: { taste_genres: [id, 'not-a-genre'] }, error: null }] });
  assert.deepEqual(await api.loadTasteGenres('me'), [id]);
  assert.ok(calls.some(call => call[0] === 'eq' && call[1] === 'user_id' && call[2] === 'me'));
});

test('saving genres deduplicates and verifies the returned account row', async () => {
  const id = genres[0].id;
  const { api, calls } = onboarding({ account_settings: [{ data: { user_id: 'me', taste_genres: [id] }, error: null }] });
  await api.saveTasteGenres('me', [id, id]);
  assert.ok(calls.some(call => call[0] === 'upsert' && call[1].user_id === 'me' && call[1].taste_genres.length === 1));
});

test('invalid genres, migration errors and unsaved rows are reported', async () => {
  await assert.rejects(onboarding({}).api.saveTasteGenres('me', ['unknown']));
  await assert.rejects(onboarding({}).api.saveTasteGenres('me', []));
  for (const response of [{ data: null, error: new Error('missing column') }, { data: { user_id: 'other', taste_genres: [genres[0].id] }, error: null }]) {
    await assert.rejects(onboarding({ account_settings: [response] }).api.saveTasteGenres('me', [genres[0].id]));
  }
});

test('onboarding progress resumes from distinct works saved in the account', async () => {
  const { api } = onboarding({ ratings: [{ data: [{ media_item_id: 'one' }, { media_item_id: 'two' }, { media_item_id: 'one' }], error: null }] });
  assert.deepEqual(await api.loadRatedMediaIds('me'), ['one', 'two']);
});

test('access checks keep the root navigator mounted but hidden and inert', () => {
  const View = ({ children, style, pointerEvents }) => React.createElement('div', { style, 'data-pointer-events': pointerEvents }, children);
  const Text = ({ children }) => React.createElement('span', null, children);
  for (const auth of [{ session: null, loading: true }, { session: candidate, loading: false }]) {
    const { TasteGate } = load('../src/features/auth/taste-gate.tsx', {
      react: React,
      'react-native': { View, Text, StyleSheet: { create: value => value, absoluteFill: { position: 'absolute', inset: 0 } } },
      'expo-router': { usePathname: () => '/search', Redirect: () => { throw new Error('Premature redirect'); }, Link: Text },
      '../../lib/supabase': { supabase: {} },
      '../../components/ui': { Button: Text },
      '../../design/tokens': { font: {}, tokens: { colors: { dark: '#000', onDark: '#fff' } } },
      './provider': { useAuth: () => ({ ...auth, error: null, retry: () => {} }) },
      './onboarding': { needsTasteOnboarding: async () => false },
      './gate-state.mjs': { tasteGateDecision },
    });
    const html = renderToStaticMarkup(React.createElement(TasteGate, null, React.createElement('span', null, 'ROOT_NAVIGATOR')));
    assert.match(html, /ROOT_NAVIGATOR/);
    assert.match(html, /Validando sua conta/);
    assert.match(html, /opacity:0/);
    assert.match(html, /data-pointer-events="none"/);
  }
});

test('entry route validates the session before entering the account', async () => {
  const { entryRouteDecision } = await import('../src/features/auth/gate-state.mjs');
  assert.equal(entryRouteDecision(true, false), 'checking');
  assert.equal(entryRouteDecision(true, true), 'checking');
  assert.equal(entryRouteDecision(false, false), 'auth');
  assert.equal(entryRouteDecision(false, true), 'account');
});
