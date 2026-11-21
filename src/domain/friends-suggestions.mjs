// Sugestões de contas para a timeline de amigos vazia (pedido do Marco em
// 21/11/2026): perfis reais do banco, excluindo a própria conta e qualquer
// relação já existente (amizade ou pedido, nos dois sentidos).
export function pickSuggestions(profiles, friendships, userId, limit = 5) {
  const related = new Set();
  for (const friendship of friendships) {
    related.add(friendship.requester_id === userId ? friendship.addressee_id : friendship.requester_id);
  }
  return profiles.filter(profile => profile.id !== userId && !related.has(profile.id)).slice(0, limit);
}
