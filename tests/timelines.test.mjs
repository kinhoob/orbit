import test from 'node:test';
import assert from 'node:assert/strict';

const { rankByLikes, sortRecent, friendIdsOf, withLike, relativeTime } = await import('../src/domain/timelines.mjs');

const r = (id, likes, created) => ({ rating_id: id, like_count: likes, created_at: created });

test('Descobrir ordena pelas mais curtidas, empate vai para a mais recente', () => {
  const a = r('a', 5, '2026-11-10T10:00:00Z');
  const b = r('b', 9, '2026-11-01T10:00:00Z');
  const c = r('c', 9, '2026-11-12T10:00:00Z');
  const d = r('d', 0, '2026-11-18T10:00:00Z');
  assert.deepEqual(rankByLikes([a, b, c, d]).map((x) => x.rating_id), ['c', 'b', 'a', 'd']);
});

test('Amigos ordena apenas por mais recente', () => {
  const a = r('a', 100, '2026-11-10T10:00:00Z');
  const b = r('b', 2, '2026-11-17T10:00:00Z');
  assert.deepEqual(sortRecent([a, b]).map((x) => x.rating_id), ['b', 'a']);
});

test('friendIdsOf aceita so amizades accepted, dos dois lados, sem seguidores', () => {
  const fs = [
    { requester_id: 'eu', addressee_id: 'ana', status: 'accepted' },
    { requester_id: 'caio', addressee_id: 'eu', status: 'accepted' },
    { requester_id: 'eu', addressee_id: 'bia', status: 'pending' },
    { requester_id: 'ana', addressee_id: 'bia', status: 'accepted' },
  ];
  assert.deepEqual(friendIdsOf('eu', fs).sort(), ['ana', 'caio']);
});

test('withLike soma e subtrai sem ficar negativo', () => {
  const base = { like_count: 0, liked_by_me: false };
  const liked = withLike(base, true);
  assert.equal(liked.like_count, 1);
  assert.equal(liked.liked_by_me, true);
  assert.equal(withLike(liked, false).like_count, 0);
  assert.equal(withLike(base, false).like_count, 0);
});

test('relativeTime em pt-BR', () => {
  const now = new Date('2026-11-18T20:00:00Z');
  assert.equal(relativeTime('2026-11-18T19:59:40Z', now), 'agora');
  assert.equal(relativeTime('2026-11-18T19:40:00Z', now), '20 min');
  assert.equal(relativeTime('2026-11-18T15:00:00Z', now), '5 h');
  assert.equal(relativeTime('2026-11-15T20:00:00Z', now), '3 d');
});

test('migration rating_likes: leitura respeita bloqueio do curtidor e do autor', async () => {
  const { readFileSync } = await import('node:fs');
  const sql = readFileSync(new URL('../supabase/migrations/202611180002_rating_likes.sql', import.meta.url), 'utf8');
  // A policy de leitura precisa filtrar curtidas cujo curtidor esta bloqueado
  // em qualquer direcao (is_blocked e bidirecional), alem da visibilidade da avaliacao.
  const readPolicy = sql.split('create policy rating_likes_read')[1].split('create policy')[0];
  assert.ok(readPolicy.includes('not public.is_blocked(auth.uid(), user_id)'), 'curtidor bloqueado deve ficar invisivel');
  assert.ok(readPolicy.includes('not public.is_blocked(auth.uid(), r.user_id)'), 'autor bloqueado deve ficar invisivel');
  assert.ok(readPolicy.includes("r.visibility = 'public'"), 'mantem regra de visibilidade publica');
  assert.ok(readPolicy.includes("r.visibility = 'friends'"), 'mantem regra de visibilidade para amigos');
  const addPolicy = sql.split('create policy rating_likes_add')[1].split('create policy')[0];
  assert.ok(addPolicy.includes('r.user_id <> auth.uid()'), 'sem auto-curtida');
  assert.ok(addPolicy.includes('not public.is_blocked(auth.uid(), r.user_id)'), 'sem curtir autor bloqueado');
});
