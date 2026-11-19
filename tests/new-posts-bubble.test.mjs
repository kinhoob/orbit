import test from 'node:test';
import assert from 'node:assert/strict';

const { countNewer, activeNewerCount, advanceWatermark, newestCreatedAt } = await import('../src/domain/timelines.mjs');

// Semantics of the "Novas publicações" bubble against a local fixture (no
// Supabase here; the live queries apply the same gt(created_at, since) plus
// RLS visibility/blocks). Fixture rows mirror the ratings the timelines show.

const base = [
  { rating_id: 'r1', created_at: '2026-11-19T10:00:00Z', like_count: 3, visibility: 'public' },
  { rating_id: 'r2', created_at: '2026-11-19T11:00:00Z', like_count: 1, visibility: 'public' },
  { rating_id: 'r3', created_at: '2026-11-19T12:00:00Z', like_count: 0, visibility: 'friends' },
];

test('contagem: só registros genuinamente mais novos que a marca d\'água', () => {
  const watermark = newestCreatedAt(base); // 12:00
  assert.equal(countNewer(base, watermark), 0);
  const withNew = [...base, { rating_id: 'r4', created_at: '2026-11-19T12:30:00Z', like_count: 0, visibility: 'public' }];
  assert.equal(countNewer(withNew, watermark), 1);
  // mesmo instante não conta: tem que ser mais novo de verdade
  const sameInstant = [...base, { rating_id: 'r5', created_at: '2026-11-19T12:00:00Z', like_count: 0, visibility: 'public' }];
  assert.equal(countNewer(sameInstant, watermark), 0);
  // mais antigo nunca conta
  const older = [...base, { rating_id: 'r6', created_at: '2026-11-19T09:00:00Z', like_count: 0, visibility: 'public' }];
  assert.equal(countNewer(older, watermark), 0);
});

test('curtidas e reordenação do ranking NÃO geram aviso de novas publicações', () => {
  const watermark = newestCreatedAt(base);
  // uma curtida muda like_count, não created_at: a contagem continua zero
  const liked = base.map((r) => (r.rating_id === 'r2' ? { ...r, like_count: 99 } : r));
  assert.equal(countNewer(liked, watermark), 0);
  // reordenar a página (ranking mudou por curtidas) também não muda a contagem
  const reordered = [...base].reverse();
  assert.equal(countNewer(reordered, watermark), 0);
});

test('exclusão de registro reduz a contagem pendente', () => {
  const watermark = newestCreatedAt(base);
  const withNew = [...base, { rating_id: 'r4', created_at: '2026-11-19T12:30:00Z', like_count: 0, visibility: 'public' }];
  assert.equal(countNewer(withNew, watermark), 1);
  const afterDelete = withNew.filter((r) => r.rating_id !== 'r4');
  assert.equal(countNewer(afterDelete, watermark), 0);
});

test('refresh/toque no balão avança a marca d\'água e zera a contagem', () => {
  let watermark = newestCreatedAt(base);
  const withNew = [...base, { rating_id: 'r4', created_at: '2026-11-19T12:30:00Z', like_count: 0, visibility: 'public' }];
  assert.equal(countNewer(withNew, watermark), 1);
  watermark = advanceWatermark(watermark, newestCreatedAt(withNew));
  assert.equal(countNewer(withNew, watermark), 0);
  // e a marca nunca regride se uma página menor/mais antiga chegar depois
  assert.equal(advanceWatermark(watermark, '2026-11-19T10:30:00Z'), watermark);
});

test('o balão flutuante mostra o aviso da timeline ATIVA', () => {
  assert.equal(activeNewerCount('descobrir', 2, 5), 2);
  assert.equal(activeNewerCount('amigos', 2, 5), 5);
  assert.equal(activeNewerCount('amigos', 2, undefined), 0);
  assert.equal(activeNewerCount('descobrir', undefined, 5), 0);
});
