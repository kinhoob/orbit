// Regras puras dos favoritos e das abas do perfil. Sem rede aqui.

/** Abas do perfil (opções abaixo dos favoritos fixados). Salvos são privados: só aparecem no próprio perfil. */
export const PROFILE_TABS = [
  { id: 'timeline', label: 'Linha do tempo', ownOnly: false },
  { id: 'collections', label: 'Coleções', ownOnly: false },
  { id: 'saved', label: 'Salvos', ownOnly: true },
];

/** Abas visíveis: no perfil de outra pessoa, as privadas somem. */
export function profileTabsFor(isOwnProfile) {
  return PROFILE_TABS.filter((tab) => isOwnProfile || !tab.ownOnly);
}

/**
 * Largura do card no carrossel de favoritos: cabem ~2,2 cards na tela,
 * então a ponta do terceiro indica que dá para arrastar (padrão carrossel).
 */
export function favoritesCarouselCardWidth(viewportWidth, maxContentWidth = 760) {
  const visible = Math.max(280, Math.min(viewportWidth || 390, maxContentWidth));
  return Math.max(150, Math.floor((visible - 48) / 2.2));
}

/** Detecta a resposta do Supabase/PostgREST para tabela ainda não aplicada. */
export function isMissingTableError(error) {
  if (!error) return false;
  const code = error.code || '';
  const message = error.message || '';
  return code === '42P01' || code === 'PGRST205'
    || /does not exist|Could not find the table/i.test(`${code} ${message}`);
}
