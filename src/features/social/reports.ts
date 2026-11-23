import { requireSupabase } from '../../lib/supabase';
import { buildReport } from '../../domain/report.mjs';
import { isMissingTableError } from '../../domain/supabase-error.mjs';

// Denúncia no perfil (pedido do Marco em 22/11/2026), da migration
// 20261123011000_reports.sql, que fica em revisão no PR. A moderação ainda
// não existe: a denúncia é só registrada, e a interface diz isso sem
// prometer análise. Enquanto a tabela não existe, estado indisponível.

let tableMissing = false;

/** Verdadeiro quando o banco respondeu que a tabela de denúncias ainda não existe. */
export function reportsUnavailable(): boolean {
  return tableMissing;
}

/** Registra a denúncia. 'invalid' para motivo fora da lista; 'unavailable' sem a tabela. */
export async function submitReport(input: { reporterId: string; reportedId: string; reason: string; details?: string }): Promise<'ok' | 'invalid' | 'unavailable'> {
  if (tableMissing) return 'unavailable';
  const record = buildReport(input);
  if (!record) return 'invalid';
  const { error } = await requireSupabase().from('reports').insert(record);
  if (error) {
    if (isMissingTableError(error)) {
      tableMissing = true;
      return 'unavailable';
    }
    throw error;
  }
  return 'ok';
}
