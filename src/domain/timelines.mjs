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
