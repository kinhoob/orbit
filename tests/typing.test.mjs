import test from 'node:test';
import assert from 'node:assert/strict';
import {
  typingChannelName,
  typingPairKey,
  shouldEmitTyping,
  typingStillVisible,
  TYPING_EMIT_INTERVAL_MS,
  TYPING_VISIBLE_MS,
} from '../src/domain/typing.mjs';

// Indicador "digitando" (pedido do Marco): presença real por postgres_changes
// na tabela typing_status (migration em revisão). Estas regras garantem que a
// chave do par é simétrica entre os dois aparelhos, que o aviso não inunda o
// banco e que o indicador some sozinho quando a pessoa para.

test('nome do canal é simétrico entre os dois lados', () => {
  assert.equal(typingChannelName('ana', 'bia'), typingChannelName('bia', 'ana'));
  assert.ok(typingChannelName('ana', 'bia').startsWith('typing:'));
});

test('chave do par é simétrica, ordenada e sem prefixo', () => {
  assert.equal(typingPairKey('bia', 'ana'), 'ana:bia');
  assert.equal(typingPairKey('ana', 'bia'), typingPairKey('bia', 'ana'));
  assert.ok(!typingPairKey('ana', 'bia').startsWith('typing:'));
});

test('avisa quando começa a digitar (rascunho sai do vazio)', () => {
  assert.equal(shouldEmitTyping('', 'o', 0, 1000), true);
  assert.equal(shouldEmitTyping('   ', 'oi', 0, 1000), true);
});

test('limita avisos contínuos a um por intervalo', () => {
  assert.equal(shouldEmitTyping('o', 'oi', 1000, 1000 + TYPING_EMIT_INTERVAL_MS - 1), false);
  assert.equal(shouldEmitTyping('o', 'oi', 1000, 1000 + TYPING_EMIT_INTERVAL_MS), true);
});

test('rascunho vazio nunca avisa "digitando"', () => {
  assert.equal(shouldEmitTyping('oi', '', 0, 5000), false);
  assert.equal(shouldEmitTyping('', '', 0, 5000), false);
});

test('indicador some depois da janela sem novos avisos', () => {
  assert.equal(typingStillVisible(1000, 1000 + TYPING_VISIBLE_MS - 1), true);
  assert.equal(typingStillVisible(1000, 1000 + TYPING_VISIBLE_MS), false);
});
