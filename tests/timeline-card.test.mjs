import test from 'node:test';
import assert from 'node:assert/strict';

const { scoreLabel, visibilityLabel, visibilityIcon } = await import('../src/domain/timelines.mjs');

test('scoreLabel formata em pt-BR com uma casa decimal no máximo', () => {
  assert.equal(scoreLabel(8.5), '8,5');
  assert.equal(scoreLabel(10), '10');
  assert.equal(scoreLabel(7), '7');
  assert.equal(scoreLabel(7.26), '7,3');
  assert.equal(scoreLabel(0), '0');
  assert.equal(scoreLabel('9.5'), '9,5');
});

test('scoreLabel nunca devolve vazio para valor inválido', () => {
  assert.equal(scoreLabel(undefined), '0');
  assert.equal(scoreLabel(NaN), '0');
});

test('visibilityLabel cobre os três níveis e cai em Pública no desconhecido', () => {
  assert.equal(visibilityLabel('public'), 'Pública');
  assert.equal(visibilityLabel('friends'), 'Amigos');
  assert.equal(visibilityLabel('private'), 'Privada');
  assert.equal(visibilityLabel('outra-coisa'), 'Pública');
  assert.equal(visibilityLabel(undefined), 'Pública');
});

test('visibilityIcon usa nomes da grade de ícones do app', () => {
  assert.equal(visibilityIcon('public'), 'eye');
  assert.equal(visibilityIcon('friends'), 'users');
  assert.equal(visibilityIcon('private'), 'eye-off');
  assert.equal(visibilityIcon(undefined), 'eye');
});
