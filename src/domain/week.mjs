// Nucleo puro do calendario semanal da tela Inicio (testavel em Node).
// As datas sao calculadas do relogio do aparelho. As indicacoes de cada dia
// vem SEMPRE da curadoria local de obras reais: sao sugestoes de o que
// ver/ouvir/jogar naquele dia, NAO datas de lancamento nem eventos oficiais.

export const WEEKDAY_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
export const WEEKDAY_LONG = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

/** Data local no formato AAAA-MM-DD. */
export function isoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Segunda-feira (00:00 local) da semana que contem a data. */
export function startOfWeek(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

/** Domingo (00:00 local) da semana que contem a data. */
export function startOfWeekSunday(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function buildWeek(start, todayIso) {
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    return {
      date,
      iso: isoDate(date),
      weekday: WEEKDAY_SHORT[date.getDay()],
      weekdayLong: WEEKDAY_LONG[date.getDay()],
      dayNum: date.getDate(),
      isToday: isoDate(date) === todayIso,
    };
  });
}

/** Os 7 dias da semana da data de referencia (segunda a domingo), com marcacao do dia atual. */
export function weekDays(reference = new Date()) {
  return buildWeek(startOfWeek(reference), isoDate(reference));
}

/** Os 7 dias da semana da data de referencia, domingo a sabado (formato da identidade de 19/11/2026). */
export function weekDaysSunday(reference = new Date()) {
  return buildWeek(startOfWeekSunday(reference), isoDate(reference));
}

/** Dia do ano (1-366), usado para variar as indicacoes de cada dia. */
export function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86400000);
}

/**
 * Indicacoes do dia: janela giratoria deterministica sobre a curadoria.
 * Mesmo dia, mesmas indicacoes; dias diferentes, janelas diferentes. Nada e
 * sorteado nem inventado: os itens sao sempre obras reais da curadoria local.
 */
export function picksForDay(items, date, count = 6) {
  if (!Array.isArray(items) || items.length === 0) return [];
  const total = Math.min(count, items.length);
  const start = dayOfYear(date) % items.length;
  return Array.from({ length: total }, (_, i) => items[(start + i) % items.length]);
}
