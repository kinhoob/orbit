// Regras puras das conquistas e insígnias do perfil (pedido do Marco em
// 23/11/2026). Espelha o catálogo da migration 20261123030000 — o banco é a
// fonte autoritativa; aqui ficam as mesmas definições para testes e para
// validar a escolha de insígnias sem rede. Sem dados privados: as conquistas
// derivam só de contagens agregadas.

export const MAX_EQUIPPED_BADGES = 3;

export const ACHIEVEMENTS = [
  { id: 'ratings_1', title: 'Primeira nota', description: 'Avaliou a primeira obra.', icon: 'star', kind: 'ratings', threshold: 1, xp: 10 },
  { id: 'ratings_5', title: 'Cinco descobertas', description: 'Avaliou 5 obras.', icon: 'sparkles', kind: 'ratings', threshold: 5, xp: 15 },
  { id: 'ratings_10', title: 'Crítico de carteirinha', description: 'Avaliou 10 obras.', icon: 'medal', kind: 'ratings', threshold: 10, xp: 25 },
  { id: 'ratings_25', title: 'Maratonista cultural', description: 'Avaliou 25 obras.', icon: 'flame', kind: 'ratings', threshold: 25, xp: 40 },
  { id: 'ratings_50', title: 'Curador veterano', description: 'Avaliou 50 obras.', icon: 'trophy', kind: 'ratings', threshold: 50, xp: 70 },
  { id: 'ratings_100', title: 'Centena', description: 'Avaliou 100 obras.', icon: 'crown', kind: 'ratings', threshold: 100, xp: 120 },
  { id: 'collections_1', title: 'Primeira coleção', description: 'Criou a primeira coleção.', icon: 'library', kind: 'collections', threshold: 1, xp: 15 },
  { id: 'collections_5', title: 'Curador de coleções', description: 'Criou 5 coleções.', icon: 'gem', kind: 'collections', threshold: 5, xp: 50 },
  { id: 'saved_10', title: 'Biblioteca viva', description: 'Salvou 10 obras para depois.', icon: 'bookmark', kind: 'saved', threshold: 10, xp: 20 },
  { id: 'friends_1', title: 'Primeira amizade', description: 'Formou a primeira amizade.', icon: 'users', kind: 'friends', threshold: 1, xp: 15 },
  { id: 'friends_5', title: 'Círculo fechado', description: 'Formou 5 amizades.', icon: 'orbit', kind: 'friends', threshold: 5, xp: 30 },
  { id: 'followers_10', title: 'Voz na órbita', description: 'Alcançou 10 seguidores.', icon: 'megaphone', kind: 'followers', threshold: 10, xp: 30 },
  { id: 'likes_10', title: 'Aplausos', description: 'Recebeu 10 curtidas nas avaliações.', icon: 'heart', kind: 'likes_received', threshold: 10, xp: 25 },
  { id: 'level_3', title: 'Nível Curioso', description: 'Alcançou o nível 3, Curioso.', icon: 'medal', kind: 'level', threshold: 3, xp: 25 },
  { id: 'level_5', title: 'Nível Colecionador', description: 'Alcançou o nível 5, Colecionador.', icon: 'flame', kind: 'level', threshold: 5, xp: 50 },
  { id: 'level_7', title: 'Nível Conhecedor', description: 'Alcançou o nível 7, Conhecedor.', icon: 'trophy', kind: 'level', threshold: 7, xp: 80 },
  { id: 'level_10', title: 'Nível Lenda', description: 'Alcançou o nível 10, Lenda.', icon: 'crown', kind: 'level', threshold: 10, xp: 150 },
];

const BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

export function achievementById(id) {
  return BY_ID.get(id) || null;
}

/** Progresso de uma conquista: fração 0..1 e texto "atual/meta" limitado na meta. */
export function achievementProgress(current, threshold) {
  const now = Math.max(0, Math.floor(Number(current) || 0));
  const goal = Math.max(1, Math.floor(Number(threshold) || 1));
  return { current: Math.min(now, goal), threshold: goal, fraction: Math.max(0, Math.min(1, now / goal)), unlocked: now >= goal };
}

/**
 * Liga/desliga uma insígnia no perfil. Só conquistas desbloqueadas entram,
 * sem repetição, até MAX_EQUIPPED_BADGES. Retorna a nova lista ou null quando
 * a escolha é inválida — o banco confirma a mesma regra no gatilho.
 */
export function toggleEquippedBadge(equipped, id, unlockedIds, max = MAX_EQUIPPED_BADGES) {
  const current = Array.isArray(equipped) ? equipped : [];
  if (current.includes(id)) return current.filter((b) => b !== id);
  if (!achievementById(id)) return null;
  if (!Array.isArray(unlockedIds) || !unlockedIds.includes(id)) return null;
  if (current.length >= max) return null;
  return [...current, id];
}

/** Soma de XP das conquistas desbloqueadas (espelha o bônus do account_progress). */
export function achievementXp(unlockedIds) {
  if (!Array.isArray(unlockedIds)) return 0;
  return unlockedIds.reduce((sum, id) => sum + (achievementById(id)?.xp || 0), 0);
}
