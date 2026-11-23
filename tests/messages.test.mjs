import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import * as domain from '../src/domain/messages.mjs';
import { isMissingTableError } from '../src/domain/supabase-error.mjs';

const source = fs.readFileSync(new URL('../src/features/social/messages.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });

/** Cliente Supabase falso com encadeamento genérico: qualquer método devolve
 * a própria cadeia, que então resolve a resposta configurada. */
function fakeClient(result) {
  const target = { then: (resolve) => resolve(result) };
  const chain = new Proxy(target, {
    get: (obj, prop) => prop === 'then' ? obj.then : () => chain,
  });
  return { from: () => chain, rpc: () => Promise.resolve(result) };
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

test('message body validation matches the bank limit', () => {
  assert.equal(domain.MESSAGE_MAX, 2000);
  assert.equal(domain.normalizeMessageBody('  oi  '), 'oi');
  assert.equal(domain.normalizeMessageBody('   '), null);
  assert.equal(domain.normalizeMessageBody(''), null);
  assert.equal(domain.normalizeMessageBody(null), null);
  assert.equal(domain.normalizeMessageBody('x'.repeat(2000)), 'x'.repeat(2000));
  assert.equal(domain.normalizeMessageBody('x'.repeat(2001)), null);
});

test('only friends can message', () => {
  assert.equal(domain.canMessageWith('friends'), true);
  assert.equal(domain.canMessageWith('outgoing'), false);
  assert.equal(domain.canMessageWith('incoming'), false);
  assert.equal(domain.canMessageWith('none'), false);
  assert.equal(domain.canMessageWith('rejected'), false);
});

test('thread sorts chronologically and flags my messages', () => {
  const rows = [
    { id: '2', sender_id: 'them', recipient_id: 'me', body: 'depois', created_at: '2026-11-22T21:00:00Z', read_at: null },
    { id: '1', sender_id: 'me', recipient_id: 'them', body: 'antes', created_at: '2026-11-22T20:00:00Z', read_at: null },
  ];
  const thread = domain.buildThread(rows, 'me');
  assert.deepEqual(thread.map((m) => m.id), ['1', '2']);
  assert.deepEqual(thread.map((m) => m.mine), [true, false]);
});

test('conversations group by person with latest and unread count', () => {
  const rows = [
    { id: '1', sender_id: 'ana', recipient_id: 'me', body: 'oi', created_at: '2026-11-22T20:00:00Z', read_at: null },
    { id: '2', sender_id: 'ana', recipient_id: 'me', body: 'alô?', created_at: '2026-11-22T21:00:00Z', read_at: null },
    { id: '3', sender_id: 'me', recipient_id: 'bia', body: 'e aí', created_at: '2026-11-22T19:00:00Z', read_at: null },
    { id: '4', sender_id: 'ana', recipient_id: 'me', body: 'lida', created_at: '2026-11-22T18:00:00Z', read_at: '2026-11-22T18:05:00Z' },
  ];
  const list = domain.groupConversations(rows, 'me');
  assert.equal(list.length, 2);
  assert.equal(list[0].otherId, 'ana');
  assert.equal(list[0].lastBody, 'alô?');
  assert.equal(list[0].lastMine, false);
  assert.equal(list[0].unread, 2);
  assert.equal(list[1].otherId, 'bia');
  assert.equal(list[1].lastMine, true);
  assert.equal(list[1].unread, 0);
});

test('missing table reads as unavailable without inventing state', async () => {
  const feature = loadFeature({ data: null, error: { code: 'PGRST205', message: "Could not find the table 'public.messages' in the schema cache" } });
  assert.equal(await feature.fetchThread('me', 'other'), null);
  assert.equal(await feature.fetchRecentMessages('me'), null);
  assert.ok(feature.messagesUnavailable());
  assert.equal(await feature.sendMessage('me', 'other', 'oi'), 'unavailable');
  await feature.markConversationRead('me', 'other'); // sem efeito, sem erro
});

test('thread and sending pass through when the table exists', async () => {
  const feature = loadFeature({ data: [{ id: '1', sender_id: 'me', recipient_id: 'other', body: 'oi', created_at: '2026-11-22T20:00:00Z', read_at: null }], error: null });
  const rows = await feature.fetchThread('me', 'other');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].body, 'oi');
  assert.equal(await feature.sendMessage('me', 'other', 'oi'), 'ok');
  assert.ok(!feature.messagesUnavailable());
});

test('RLS refusal reads as not-friends instead of a generic failure', async () => {
  const feature = loadFeature({ data: null, error: { code: '42501', message: 'new row violates row-level security policy' } });
  assert.equal(await feature.sendMessage('me', 'other', 'oi'), 'not-friends');
  assert.ok(!feature.messagesUnavailable());
});

test('unexpected errors propagate instead of pretending', async () => {
  const feature = loadFeature({ data: null, error: { code: 'XX000', message: 'boom' } });
  await assert.rejects(() => feature.fetchThread('me', 'other'));
  assert.ok(!feature.messagesUnavailable());
});
