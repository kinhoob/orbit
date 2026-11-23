// Regras puras da denúncia no perfil (pedido do Marco em 22/11/2026).
// A moderação ainda não existe: a denúncia só fica registrada, e a interface
// nunca promete análise ou consequência automática. Sem rede aqui.

export const REPORT_REASONS = [
  { id: 'spam', label: 'Spam ou golpe' },
  { id: 'hate', label: 'Discurso de ódio' },
  { id: 'harassment', label: 'Assédio ou intimidação' },
  { id: 'inappropriate', label: 'Conteúdo impróprio' },
  { id: 'other', label: 'Outro motivo' },
];

export const REPORT_DETAILS_MAX = 500;

export function isValidReportReason(id) {
  return REPORT_REASONS.some((reason) => reason.id === id);
}

/** Detalhe opcional: espaços aparados e limite igual ao do banco (500). */
export function normalizeReportDetails(text) {
  return String(text || '').trim().slice(0, REPORT_DETAILS_MAX);
}

/** Monta o registro ou devolve null quando o motivo é inválido. */
export function buildReport({ reporterId, reportedId, reason, details = '' }) {
  if (!reporterId || !reportedId || reporterId === reportedId) return null;
  if (!isValidReportReason(reason)) return null;
  return {
    reporter_id: reporterId,
    reported_id: reportedId,
    reason,
    details: normalizeReportDetails(details),
  };
}
