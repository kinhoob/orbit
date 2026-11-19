import test from 'node:test';
import assert from 'node:assert/strict';

const { SWIPE_SCREENS, swipeIndex, hasSwipeNeighbor, shouldStartScreenSwipe, swipeTargetRoute } = await import('../src/domain/screen-swipe.mjs');
const { pagerYieldsAtEdge } = await import('../src/domain/pager.mjs');

test('a ordem do arraste segue a barra de baixo, sem o Criar', () => {
  assert.deepEqual(SWIPE_SCREENS, ['index', 'discover', 'search', 'notifications']);
  assert.equal(swipeIndex('create'), -1);
  assert.equal(swipeIndex('profile'), -1);
});

test('arrastar para a esquerda alem do limiar avanca para a proxima tela', () => {
  assert.equal(swipeTargetRoute('index', -100, 390), 'discover');
  assert.equal(swipeTargetRoute('discover', -100, 390), 'search');
  assert.equal(swipeTargetRoute('search', -100, 390), 'notifications');
});

test('arrastar para a direita alem do limiar volta para a tela anterior', () => {
  assert.equal(swipeTargetRoute('notifications', 100, 390), 'search');
  assert.equal(swipeTargetRoute('search', 100, 390), 'discover');
  assert.equal(swipeTargetRoute('discover', 100, 390), 'index');
});

test('nas pontas nao ha para onde ir e arraste curto mantem a tela', () => {
  assert.equal(swipeTargetRoute('index', 200, 390), null);
  assert.equal(swipeTargetRoute('notifications', -200, 390), null);
  assert.equal(swipeTargetRoute('discover', -30, 390), null);
});

test('telas fora do arraste nunca navegam pelo gesto', () => {
  assert.equal(swipeTargetRoute('create', -200, 390), null);
  assert.equal(hasSwipeNeighbor('create', -100), false);
});

test('o gesto so comeca com horizontal dominante, fora da borda da gaveta e com vizinha', () => {
  assert.equal(shouldStartScreenSwipe('index', 100, -40, 0), true);
  assert.equal(shouldStartScreenSwipe('index', 10, -40, 0), false); // faixa da gaveta do Perfil
  assert.equal(shouldStartScreenSwipe('index', 100, 40, 0), false); // Início não tem anterior
  assert.equal(shouldStartScreenSwipe('discover', 100, -40, 50), false); // vertical domina
  assert.equal(shouldStartScreenSwipe('discover', 100, -8, 0), false); // deslocamento mínimo
});

test('o pager das timelines entrega o gesto à troca de telas na borda', () => {
  assert.equal(pagerYieldsAtEdge(0, 2, 50), true); // Descobrir + arraste à direita -> Início
  assert.equal(pagerYieldsAtEdge(1, 2, -50), true); // Amigos + arraste à esquerda -> Busca
  assert.equal(pagerYieldsAtEdge(0, 2, -50), false); // ainda há página à frente
  assert.equal(pagerYieldsAtEdge(1, 2, 50), false); // ainda há página atrás
  assert.equal(pagerYieldsAtEdge(0, 2, 0), false);
  assert.equal(pagerYieldsAtEdge(0, 1, -50), true); // pager de uma página entrega sempre
  assert.equal(pagerYieldsAtEdge(0, 1, 50), true);
});
