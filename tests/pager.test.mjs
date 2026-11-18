import test from 'node:test';
import assert from 'node:assert/strict';

const { resolveSwipeTarget, rubberBand, pullOffset, shouldStartPull, PULL_THRESHOLD, PULL_MAX, PULL_HOLD_OFFSET } = await import('../src/domain/pager.mjs');

test('arraste para a esquerda alem do limiar avanca para a proxima pagina', () => {
  assert.equal(resolveSwipeTarget(0, -100, 2, 390), 1);
});

test('arraste para a direita alem do limiar volta para a pagina anterior', () => {
  assert.equal(resolveSwipeTarget(1, 100, 2, 390), 0);
});

test('arraste curto mantem a pagina atual', () => {
  assert.equal(resolveSwipeTarget(0, -20, 2, 390), 0);
  assert.equal(resolveSwipeTarget(1, 30, 2, 390), 1);
});

test('nas bordas nao ha para onde ir', () => {
  assert.equal(resolveSwipeTarget(0, 200, 2, 390), 0);
  assert.equal(resolveSwipeTarget(1, -200, 2, 390), 1);
});

test('com uma pagina so ou dados invalidos, mantem a pagina', () => {
  assert.equal(resolveSwipeTarget(0, -200, 1, 390), 0);
  assert.equal(resolveSwipeTarget(0, Number.NaN, 2, 390), 0);
});

test('o limiar respeita piso e teto em qualquer largura', () => {
  // largura pequena: limiar minimo de 40 px
  assert.equal(resolveSwipeTarget(0, -45, 2, 100), 1);
  // largura grande: limiar limitado a 140 px
  assert.equal(resolveSwipeTarget(0, -141, 2, 2000), 1);
  assert.equal(resolveSwipeTarget(0, -139, 2, 2000), 0);
});

test('rubberBand limita o arraste nas bordas com resistencia', () => {
  assert.equal(rubberBand(-50, -100, 0), -50);
  assert.ok(rubberBand(50, -100, 0) > 0 && rubberBand(50, -100, 0) < 20);
  assert.ok(rubberBand(-150, -100, 0) < -100 && rubberBand(-150, -100, 0) > -120);
});

test('pullOffset rende metade do gesto, sem passar do curso maximo nem ficar negativo', () => {
  assert.equal(pullOffset(80), 40);
  assert.equal(pullOffset(1000), PULL_MAX);
  assert.equal(pullOffset(-30), 0);
  assert.equal(pullOffset(Number.NaN), 0);
});

test('o gesto de puxar exige lista no topo e vertical dominante', () => {
  assert.equal(shouldStartPull(true, 20, 5), true);
  assert.equal(shouldStartPull(false, 20, 5), false);
  assert.equal(shouldStartPull(true, 8, 5), false);
  assert.equal(shouldStartPull(true, 20, 40), false);
});

test('o limiar de atualizacao e positivo e menor que o curso maximo', () => {
  assert.ok(PULL_THRESHOLD > 0 && PULL_THRESHOLD < PULL_MAX);
});

test('ao soltar alem do limiar o conteudo recolhe: a bolinha de carregar fica na linha "Atualizando…"', () => {
  assert.equal(PULL_HOLD_OFFSET, 0);
});
