import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import * as domain from '../src/domain/report.mjs';
import { isMissingTableError } from '../src/domain/supabase-error.mjs';

const source = fs.readFileSync(new URL('../src/features/social/reports.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });

function loadFeature(insert) {
  const api = {};
  new Function('require', 'exports', outputText)((name) => {
    if (name.includes('supabase-error')) return { isMissingTableError };
    if (name.includes('domain/report')) return domain;
    if (name.includes('supabase')) return { requireSupabase: () => ({ from: () => ({ insert }) }) };
    return {};
  }, api);
  return api;
}

test('report reasons are the fixed moderation-free list', () => {
  assert.deepEqual(domain.REPORT_REASONS.map((r) => r.id), ['spam', 'hate', 'harassment', 'inappropriate', 'other']);
  assert.ok(domain.isValidReportReason('spam'));
  assert.ok(!domain.isValidReportReason('crime'));
  assert.ok(!domain.isValidReportReason(''));
});

test('details are trimmed and capped at the database limit', () => {
  assert.equal(domain.normalizeReportDetails('  oi  '), 'oi');
  assert.equal(domain.normalizeReportDetails(null), '');
  assert.equal(domain.normalizeReportDetails('x'.repeat(600)).length, 500);
});

test('buildReport rejects self-reports and invalid reasons', () => {
  assert.equal(domain.buildReport({ reporterId: 'a', reportedId: 'a', reason: 'spam' }), null);
  assert.equal(domain.buildReport({ reporterId: 'a', reportedId: 'b', reason: 'crime' }), null);
  assert.equal(domain.buildReport({ reporterId: '', reportedId: 'b', reason: 'spam' }), null);
  assert.deepEqual(domain.buildReport({ reporterId: 'a', reportedId: 'b', reason: 'spam', details: '  texto ' }), {
    reporter_id: 'a', reported_id: 'b', reason: 'spam', details: 'texto',
  });
});

test('submitReport stores the record without promising moderation', async () => {
  let saved = null;
  const feature = loadFeature(async (record) => { saved = record; return { error: null }; });
  assert.equal(await feature.submitReport({ reporterId: 'a', reportedId: 'b', reason: 'hate', details: 'detalhe' }), 'ok');
  assert.deepEqual(saved, { reporter_id: 'a', reported_id: 'b', reason: 'hate', details: 'detalhe' });
  assert.ok(!feature.reportsUnavailable());
});

test('invalid reason never touches the database', async () => {
  let called = false;
  const feature = loadFeature(async () => { called = true; return { error: null }; });
  assert.equal(await feature.submitReport({ reporterId: 'a', reportedId: 'b', reason: 'crime' }), 'invalid');
  assert.equal(called, false);
});

test('missing table answers unavailable instead of pretending the report was sent', async () => {
  const feature = loadFeature(async () => ({ error: { code: '42P01', message: 'relation "public.reports" does not exist' } }));
  assert.equal(await feature.submitReport({ reporterId: 'a', reportedId: 'b', reason: 'spam' }), 'unavailable');
  assert.ok(feature.reportsUnavailable());
});

test('unexpected errors propagate', async () => {
  const feature = loadFeature(async () => ({ error: { code: 'XX000', message: 'boom' } }));
  await assert.rejects(() => feature.submitReport({ reporterId: 'a', reportedId: 'b', reason: 'spam' }));
  assert.ok(!feature.reportsUnavailable());
});
