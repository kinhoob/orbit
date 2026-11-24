// Nucleo puro das timelines do Explorar (testavel em Node, sem Supabase).
// Tipos e funcoes de leitura ficam em src/features/feed/timelines.ts.

// ---- nucleo puro, testavel sem Supabase ----

/** Descobrir: mais curtidas primeiro; empate vai para a mais recente. */
export function rankByLikes(reviews) {
  return [...reviews].sort((a, b) => b.like_count - a.like_count || b.created_at.localeCompare(a.created_at));
}

/** Amigos: mais recentes primeiro. */
export function sortRecent(reviews) {
  return [...reviews].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/** Ids dos amigos aceitos de um usuario (amizade bidirecional, qualquer lado). */
export function friendIdsOf(userId, friendships) {
  return friendships
    .filter((f) => f.status === 'accepted' && (f.requester_id === userId || f.addressee_id === userId))
    .map((f) => (f.requester_id === userId ? f.addressee_id : f.requester_id));
}

/** Aplica/remover curtida de forma otimista na UI. */
export function withLike(review, liked) {
  if (liked === review.liked_by_me) return review;
  return { ...review, liked_by_me: liked, like_count: Math.max(0, review.like_count + (liked ? 1 : -1)) };
}

/** Maior created_at da lista exibida: marca d'agua para detectar publicacoes novas de verdade. Null se a lista estiver vazia. */
export function newestCreatedAt(reviews) {
  let newest = null;
  for (const review of reviews || []) {
    if (review && typeof review.created_at === 'string' && (newest === null || review.created_at > newest)) newest = review.created_at;
  }
  return newest;
}

/** Marca d'agua das novidades: avanca com o snapshot mais recente verificado e
 * nunca regride (uma pagina reordenada ou menor nao reabre o balao). */
export function advanceWatermark(current, snapshotNewest) {
  if (!snapshotNewest) return current || null;
  if (!current) return snapshotNewest;
  return snapshotNewest > current ? snapshotNewest : current;
}

/** Contagem do balao "Novas publicacoes": so avaliacoes mais novas que a
 * marca d'agua (mesmo criterio do gt(created_at, since) das consultas;
 * curtidas e reordenacoes nao contam, porque nao mudam created_at). */
export function countNewer(reviews, since) {
  if (!since) return 0;
  return (reviews || []).filter((r) => r && typeof r.created_at === 'string' && r.created_at > since).length;
}

/** O balao flutuante mostra o aviso da timeline ATIVA (estilo X). */
export function activeNewerCount(timeline, discoverCount, friendsCount) {
  return timeline === 'amigos' ? (friendsCount || 0) : (discoverCount || 0);
}

/** Tempo relativo curto em pt-BR para o cartao da timeline. */
export function relativeTime(iso, now = new Date()) {
  const diff = Math.max(0, now.getTime() - new Date(iso).getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} d`;
  return new Date(iso).toLocaleDateString('pt-BR');
}

/** Erro de coluna ausente (ex.: genres antes da migration chegar ao banco):
 * Postgres 42703 ou PostgREST PGRST204 / mensagem de schema cache. */
export function isMissingColumnError(error) {
  if (!error) return false;
  const code = error.code || '';
  const message = error.message || '';
  return code === '42703' || code === 'PGRST204'
    || /column .+ does not exist|Could not find the '.+' column/i.test(`${code} ${message}`);
}

/** Nota 0-10 em pt-BR com no máximo uma casa decimal (8.5 -> "8,5", 10 -> "10"). */
export function scoreLabel(score) {
  const value = Number(score);
  if (!Number.isFinite(value)) return '0';
  const rounded = Math.round(value * 10) / 10;
  return String(rounded).replace('.', ',');
}

/** Rótulo da visibilidade da avaliação; valor desconhecido cai em Pública. */
export function visibilityLabel(visibility) {
  if (visibility === 'private') return 'Privada';
  if (visibility === 'friends') return 'Amigos';
  return 'Pública';
}

/** Ícone da visibilidade (mesmos nomes da grade de ícones do app). */
export function visibilityIcon(visibility) {
  if (visibility === 'private') return 'eye-off';
  if (visibility === 'friends') return 'users';
  return 'eye';
}
