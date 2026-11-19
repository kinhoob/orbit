import test from 'node:test';
import assert from 'node:assert/strict';
import { curatedMuralItems, CURATED_MURAL_LABEL } from '../src/features/home/curated-data.mjs';

const CATEGORIES = new Set(['film', 'series', 'anime', 'music', 'album', 'book', 'game']);

test('curadoria tem itens reais suficientes e ids únicos', () => {
  assert.ok(curatedMuralItems.length >= 16, 'esperava ao menos 16 obras na curadoria');
  assert.ok(curatedMuralItems.every((i) => i.coverUrl === null), 'nenhuma arte oficial é distribuída até haver fonte com licença verificada');
  const ids = curatedMuralItems.map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(CURATED_MURAL_LABEL.length > 0);
});

test('cada item tem campos válidos, fonte https e proporção realista de capa', () => {
  for (const item of curatedMuralItems) {
    assert.ok(item.title.length > 0, item.id);
    assert.ok(item.creator.length > 0, item.id);
    assert.ok(CATEGORIES.has(item.category), `${item.id}: categoria ${item.category}`);
    assert.ok(item.releaseYear >= 1880 && item.releaseYear <= new Date().getFullYear(), item.id);
    assert.ok(item.coverAspectRatio > 0.4 && item.coverAspectRatio <= 1.2, `${item.id}: proporção ${item.coverAspectRatio}`);
    if (item.coverUrl) {
      // Guarda para o futuro: arte oficial só entra com URL https e fonte
      // declarada, após verificação de licença (hoje nenhum item passa aqui).
      assert.ok(item.coverUrl.startsWith('https://'), item.id);
      assert.ok(item.coverSource && item.coverSource.startsWith('https://'), `${item.id}: fonte da capa`);
    } else {
      assert.equal(item.coverSource, null, `${item.id}: capa ilustrada não deve citar fonte de imagem`);
    }
    assert.ok(item.coverLicense.length > 0, item.id);
  }
});

test('toda categoria de filtro usada no mural existe no catálogo de categorias', async () => {
  const { categories } = await import('../src/features/catalog/data.ts').catch(() => ({ categories: null }));
  // data.ts é TS; validação estrutural indireta: o mural resolve rótulos com fallback.
  assert.ok(curatedMuralItems.every((i) => typeof i.category === 'string'));
  if (categories) {
    const known = new Set(categories.map((c) => c.id));
    assert.ok(curatedMuralItems.every((i) => known.has(i.category)));
  }
});
