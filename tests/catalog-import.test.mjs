import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { fromWikidata, fromMusicbrainz, dedupe, sortRows } = await import('../scripts/catalog-import/normalize.mjs');

const wikidata = JSON.parse(readFileSync('scripts/catalog-import/sample/wikidata-items.json', 'utf8'));
const albums = JSON.parse(readFileSync('scripts/catalog-import/sample/musicbrainz-albums.json', 'utf8'));

test('amostra tem obras reais com identificadores das fontes', () => {
  assert.ok(wikidata.length >= 5, 'amostra Wikidata pequena demais');
  assert.ok(albums.length >= 5, 'amostra MusicBrainz pequena demais');
  for (const item of wikidata) assert.match(item.external_id, /^Q\d+$/);
  for (const item of albums) assert.match(item.external_id, /^[0-9a-f-]{36}$/);
  const ids = [...wikidata, ...albums].map((i) => i.external_id);
  assert.equal(new Set(ids).size, ids.length, 'amostra sem duplicados');
});

test('normalizacao preserva proveniencia e marca capa como ilustrada', () => {
  const row = fromWikidata(wikidata[0]);
  assert.equal(row.external_source, 'wikidata');
  assert.equal(row.cover_url, null);
  assert.match(row.description, /Wikidata \(CC0\)/);
  const album = fromMusicbrainz(albums[0]);
  assert.equal(album.category, 'album');
  assert.match(album.description, /MusicBrainz \(CC0\)/);
});

test('dedupe usa o par fonte+id e ordenacao e deterministica', () => {
  const rows = [...wikidata.map(fromWikidata), ...albums.map(fromMusicbrainz)];
  const dup = [...rows, rows[0]];
  assert.equal(dedupe(dup).length, rows.length);
  assert.deepEqual(sortRows(rows).map((x) => x.external_id), sortRows([...rows].reverse()).map((x) => x.external_id));
});

test('seed gerada e idempotente (on conflict do update) e sem arte oficial', () => {
  const seed = readFileSync('supabase/seed_catalog_cc0.sql', 'utf8');
  const inserts = seed.match(/insert into public\.media_items/g) || [];
  assert.equal(inserts.length, dedupe([...wikidata.map(fromWikidata), ...albums.map(fromMusicbrainz)]).length);
  assert.equal((seed.match(/on conflict \(external_source, external_id\) do update/g) || []).length, inserts.length);
  assert.ok(!seed.includes('http') || !/values \('[^']*', '[^']*', '[^']*'::public\.media_category, '[^']*', 'http/.test(seed), 'cover_url sempre null');
  assert.match(seed, /AMOSTRA real, nao o catalogo completo/);
});

test('registro invalido falha alto em vez de gerar linha quebrada', () => {
  assert.throws(() => fromWikidata({ external_id: 'abc', title: 'X' }));
  assert.throws(() => fromMusicbrainz({ external_id: 'Q1', title: 'X' }));
});
