import test from 'node:test';
import assert from 'node:assert/strict';

const tvmazePayload = [
  { show: { id: 1, name: 'Dark', type: 'Scripted', genres: ['Drama'], premiered: '2017-12-01', url: 'https://www.tvmaze.com/shows/1/dark', network: null, webChannel: { name: 'Netflix' } } },
  { show: { id: 2, name: 'Cowboy Bebop', type: 'Animation', genres: ['Action', 'Anime'], premiered: '1998-04-03', url: 'https://www.tvmaze.com/shows/2/cowboy-bebop', network: { name: 'TV Tokyo' }, webChannel: null } },
];
const olPayload = { docs: [
  { key: '/works/OL1W', title: 'Dom Casmurro', author_name: ['Machado de Assis'], first_publish_year: 1899 },
  { key: '/works/OL2W', title: '', author_name: [], first_publish_year: null },
] };

function fakeFetch(map) {
  return async (url) => {
    for (const [prefix, payload] of Object.entries(map)) {
      if (url.startsWith(prefix)) return { ok: true, json: async () => payload };
    }
    return { ok: false, json: async () => ({}) };
  };
}
const fetchOk = fakeFetch({ 'https://api.tvmaze.com': tvmazePayload, 'https://openlibrary.org': olPayload });

test('busca pública normaliza séries, animes e livros com fonte e URL', async () => {
  const { searchPublicCatalog } = await import('../src/features/catalog/public-search.ts');
  const items = await searchPublicCatalog('dark', undefined, fetchOk);
  const dark = items.find((i) => i.id === 'tvmaze-1');
  const bebop = items.find((i) => i.id === 'tvmaze-2');
  const book = items.find((i) => i.category === 'book');
  assert.equal(dark.category, 'series');
  assert.equal(dark.creator, 'Netflix');
  assert.equal(dark.releaseYear, 2017);
  assert.equal(dark.source, 'TVmaze');
  assert.ok(dark.sourceUrl.startsWith('https://'));
  assert.equal(bebop.category, 'anime');
  assert.equal(book.title, 'Dom Casmurro');
  assert.equal(book.creator, 'Machado de Assis');
  assert.equal(book.source, 'Open Library');
  assert.ok(items.every((i) => i.title.length > 0), 'itens sem título são descartados');
});

test('filtro de categoria consulta só o provedor correspondente', async () => {
  const { searchPublicCatalog } = await import('../src/features/catalog/public-search.ts');
  const called = [];
  const spy = async (url) => { called.push(url); return fetchOk(url); };
  const seriesOnly = await searchPublicCatalog('dark', 'series', spy);
  assert.ok(seriesOnly.every((i) => i.category === 'series' || i.category === 'anime'));
  assert.ok(called.every((u) => u.startsWith('https://api.tvmaze.com')));
  called.length = 0;
  const booksOnly = await searchPublicCatalog('dom', 'book', spy);
  assert.ok(booksOnly.every((i) => i.category === 'book'));
  assert.ok(called.every((u) => u.startsWith('https://openlibrary.org')));
});

test('falha de um provedor não derruba o outro e busca curta não consulta nada', async () => {
  const { searchPublicCatalog } = await import('../src/features/catalog/public-search.ts');
  const partial = await searchPublicCatalog('dark', undefined, fakeFetch({ 'https://api.tvmaze.com': tvmazePayload }));
  assert.ok(partial.length > 0);
  assert.equal(await searchPublicCatalog('d', undefined, fetchOk).then((r) => r.length), 0);
});
