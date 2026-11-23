// Regras puras do seguir unilateral (decisão do Marco em 22/11/2026): seguir
// não pede aceite; quando a pessoa segue de volta, os dois viram amigos
// (gatilho follows_mutual_friendship no banco). Deixar de seguir desfaz a
// amizade e a permissão de novas mensagens (gatilho
// follows_unfriend_on_unfollow). Sem rede aqui.

/** Rótulo do botão de seguir no perfil de outra pessoa. */
export function followLabel(following) {
  return following ? 'Seguindo' : 'Seguir';
}

/** Próximo estado ao tocar no botão, com o delta aplicado na contagem. */
export function nextFollow(following) {
  const next = !following;
  return { following: next, delta: next ? 1 : -1 };
}

/** Contagem otimista de seguidores/seguindo, nunca negativa. */
export function adjustFollowCount(value, delta) {
  return Math.max(0, (Number(value) || 0) + delta);
}
