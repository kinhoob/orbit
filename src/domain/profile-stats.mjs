// Regras puras dos números do perfil. Sem rede aqui.

/** Números exibidos no perfil (pedido do Marco em 22/11/2026), estilo TikTok/Instagram, sem seguidores. */
export const PROFILE_STATS = [
  { id: 'ratings', label: 'Avaliações' },
  { id: 'friends', label: 'Amigos' },
  { id: 'likes', label: 'Curtidas' },
];

/** Contagem compacta em português: exata até 999, depois "1,2 mil" e "3,4 mi". */
export function formatStatCount(value) {
  const n = Math.max(0, Math.floor(Number(value) || 0));
  if (n < 1000) return String(n);
  const units = [[1000, 'mil'], [1000000, 'mi'], [1000000000, 'bi']];
  let i = 0;
  while (i + 1 < units.length && n >= units[i + 1][0]) i++;
  let rounded = Math.round((n / units[i][0]) * 10) / 10;
  while (rounded >= 1000 && i + 1 < units.length) { // 1000 mil vira 1 mi
    i++;
    rounded = Math.round((n / units[i][0]) * 10) / 10;
  }
  const text = String(rounded).replace('.', ',').replace(/,0$/, '');
  return `${text} ${units[i][1]}`;
}

/** Detecta a resposta do Supabase/PostgREST para RPC ainda não aplicada. */
export function isMissingFunctionError(error) {
  if (!error) return false;
  const code = error.code || '';
  const message = error.message || '';
  return code === '42883' || code === 'PGRST202'
    || /does not exist|Could not find the function/i.test(`${code} ${message}`);
}
