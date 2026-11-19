import test from 'node:test';
import assert from 'node:assert/strict';

const { DRAWER_WIDTH_PX, EDGE_ZONE_PX, isEdgeStart, shouldOpenDrawer, shouldCloseDrawer, drawerOpenOffset, drawerCloseOffset } = await import('../src/domain/drawer.mjs');
const { shouldStartPager } = await import('../src/domain/pager.mjs');
const { notificationText, unreadBadgeLabel } = await import('../src/domain/notifications.mjs');

// ---- gaveta do Perfil: faixa da borda esquerda ----

test('o gesto da gaveta so comeca na faixa da borda esquerda', () => {
  assert.equal(isEdgeStart(0), true);
  assert.equal(isEdgeStart(EDGE_ZONE_PX), true);
  assert.equal(isEdgeStart(EDGE_ZONE_PX + 1), false);
  assert.equal(isEdgeStart(200), false);
});

test('o pager nao responde a gestos iniciados na faixa da gaveta', () => {
  // mesmo arraste horizontal forte: comecou na borda, pertence a gaveta
  assert.equal(shouldStartPager(10, -80, 0, EDGE_ZONE_PX), false);
  assert.equal(shouldStartPager(EDGE_ZONE_PX, -80, 0, EDGE_ZONE_PX), false);
  // no meio da tela o pager responde normalmente
  assert.equal(shouldStartPager(200, -80, 0, EDGE_ZONE_PX), true);
});

test('o pager continua exigindo movimento horizontal dominante', () => {
  assert.equal(shouldStartPager(200, 8, 0, EDGE_ZONE_PX), false);
  assert.equal(shouldStartPager(200, 20, 30, EDGE_ZONE_PX), false);
  assert.equal(shouldStartPager(200, 30, 20, EDGE_ZONE_PX), true);
});

test('abrir exige arraste ou velocidade suficientes', () => {
  assert.equal(shouldOpenDrawer(30), false);
  assert.equal(shouldOpenDrawer(80), true);
  assert.equal(shouldOpenDrawer(20, 0.5), true);
  assert.equal(shouldCloseDrawer(-30), false);
  assert.equal(shouldCloseDrawer(-80), true);
  assert.equal(shouldCloseDrawer(-20, -0.5), true);
});

test('a gaveta acompanha o dedo com limite e resistencia', () => {
  assert.equal(drawerOpenOffset(0), -DRAWER_WIDTH_PX);
  assert.equal(drawerOpenOffset(140), -140);
  assert.equal(drawerOpenOffset(DRAWER_WIDTH_PX), 0);
  // alem do fim rende pouco (resistencia), nunca passa de 0
  assert.ok(drawerOpenOffset(DRAWER_WIDTH_PX + 40) <= 0);
  assert.ok(drawerOpenOffset(DRAWER_WIDTH_PX + 40) > -1);
  assert.equal(drawerCloseOffset(0), 0);
  assert.equal(drawerCloseOffset(-140), -140);
  assert.ok(drawerCloseOffset(-DRAWER_WIDTH_PX - 40) >= -DRAWER_WIDTH_PX);
});

// ---- textos e contador do sino ----

test('texto de cada tipo de notificacao real', () => {
  assert.equal(notificationText('friend_request', 'Ana'), 'Ana pediu para ser seu amigo.');
  assert.equal(notificationText('friend_accepted', 'Ana'), 'Ana aceitou seu pedido de amizade.');
  assert.equal(notificationText('rating_like', 'Ana'), 'Ana curtiu sua avaliação.');
});

test('sem nome de quem agiu, usa Alguém', () => {
  assert.equal(notificationText('rating_like', ''), 'Alguém curtiu sua avaliação.');
});

test('contador do sino: zero nao mostra nada e acima de 9 vira 9+', () => {
  assert.equal(unreadBadgeLabel(0), '');
  assert.equal(unreadBadgeLabel(3), '3');
  assert.equal(unreadBadgeLabel(12), '9+');
});
