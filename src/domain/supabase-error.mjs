// Detecção compartilhada de "tabela ainda não existe no banco" — usada para
// mostrar estado honesto enquanto uma migration está em revisão, nunca
// inventar dado. Sem rede aqui.

export function isMissingTableError(error) {
  if (!error) return false;
  const code = error.code || '';
  const message = error.message || '';
  return code === '42P01' || code === 'PGRST205'
    || /does not exist|Could not find the table/i.test(`${code} ${message}`);
}
