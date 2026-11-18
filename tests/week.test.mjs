// Testes do calendario semanal e das indicacoes por dia da tela Inicio.
import test from 'node:test';
import assert from 'node:assert/strict';
import { weekDays, startOfWeek, picksForDay, isoDate } from '../src/domain/week.mjs';
import { curatedMuralItems } from '../src/features/home/curated-data.mjs';

test('a semana tem 7 dias consecutivos comecando na segunda-feira', () => {
  const days = weekDays(new Date(2026, 10, 18)); // quarta, 18/11/2026
  assert.equal(days.length, 7);
  assert.deepEqual(days.map((d) => d.iso), ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22']);
  assert.deepEqual(days.map((d) => d.weekday), ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']);
});

test('virada de mes: a semana de 30/11/2026 atravessa para dezembro', () => {
  const days = weekDays(new Date(2026, 11, 2)); // quarta, 02/12/2026
  assert.equal(days[0].iso, '2026-11-30');
  assert.equal(days[6].iso, '2026-12-06');
});

test('domingo pertence a semana que comecou na segunda anterior', () => {
  const start = startOfWeek(new Date(2026, 11, 6)); // domingo, 06/12/2026
  assert.equal(isoDate(start), '2026-11-30');
});

test('isToday marca somente a data de referencia', () => {
  const ref = new Date(2026, 10, 18);
  const days = weekDays(ref);
  assert.deepEqual(days.map((d) => d.isToday), [false, false, true, false, false, false, false]);
});

test('as indicacoes do dia sao deterministicas e vem da curadoria real', () => {
  const day = new Date(2026, 10, 18);
  const first = picksForDay(curatedMuralItems, day);
  const second = picksForDay(curatedMuralItems, day);
  assert.deepEqual(first.map((i) => i.id), second.map((i) => i.id));
  assert.equal(first.length, 6);
  const realIds = new Set(curatedMuralItems.map((i) => i.id));
  for (const item of first) assert.ok(realIds.has(item.id), `${item.id} precisa ser uma obra real da curadoria`);
});

test('dias diferentes da semana mostram indicacoes diferentes', () => {
  const days = weekDays(new Date(2026, 10, 18));
  const firstPicks = days.map((d) => picksForDay(curatedMuralItems, d.date)[0]?.id);
  assert.equal(new Set(firstPicks).size, 7);
});

test('curadoria vazia nao quebra o calendario', () => {
  assert.deepEqual(picksForDay([], new Date(2026, 10, 18)), []);
});
