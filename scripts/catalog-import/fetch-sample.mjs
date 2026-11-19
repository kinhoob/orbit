// Busca uma AMOSTRA PEQUENA de registros reais em fontes CC0 para demonstrar
// o pipeline de importacao de ponta a ponta, sem baixar dumps completos.
// Fontes (licenca CC0 verificada em 18/11/2026):
// - Wikidata (filmes e series): https://www.wikidata.org/wiki/Wikidata:Licensing
// - MusicBrainz (albuns): https://musicbrainz.org/doc/MusicBrainz_Database/Download
// A importacao completa usa os DUMPS oficiais; este script consulta as APIs
// publicas apenas para a amostra versionada em sample/.
// Uso: node scripts/catalog-import/fetch-sample.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
const UA = { 'User-Agent': 'ORBIT-catalog-import-sample/0.1 (projeto pessoal; contato via repositorio)' };

// Titulos escolhidos a dedo para a amostra (obras reais e conhecidas); a
// categoria vem da intencao da consulta e cada registro e verificado na fonte.
const WANTED = [
  { query: 'The Godfather', category: 'film', type: 'film' },
  { query: 'Cidade de Deus', category: 'film', type: 'film' },
  { query: 'Parasite', category: 'film', type: 'film' },
  { query: 'Spirited Away', category: 'anime', type: 'film' },
  { query: 'Breaking Bad', category: 'series', type: 'series' },
  { query: 'Cowboy Bebop', category: 'anime', type: 'anime' },
];
const ALBUMS = [
  'releasegroup:"Abbey Road" AND artistname:"The Beatles"',
  'releasegroup:"Thriller" AND artistname:"Michael Jackson"',
  'releasegroup:"OK Computer" AND artistname:"Radiohead"',
  'releasegroup:"Rumours" AND artistname:"Fleetwood Mac"',
  'releasegroup:"Kind of Blue" AND artistname:"Miles Davis"',
];

const wdGet = async (params, attempt = 0) => {
  const url = 'https://www.wikidata.org/w/api.php?format=json&origin=*&' + params;
  const res = await fetch(url, { headers: UA });
  if (res.status === 429 && attempt < 4) {
    const wait = Number(res.headers.get('retry-after') || 5) * 1000 * (attempt + 1);
    console.log('429, aguardando', wait / 1000, 's');
    await new Promise((r) => setTimeout(r, wait));
    return wdGet(params, attempt + 1);
  }
  if (!res.ok) throw new Error('Wikidata HTTP ' + res.status);
  return res.json();
};

let wikidataItems = [];
try { wikidataItems = JSON.parse(await import('node:fs').then((fs) => fs.readFileSync(join(dir, 'sample/wikidata-items.json'), 'utf8'))); } catch {}
const done = new Set(wikidataItems.map((i) => i.title));
for (const wanted of WANTED) {
  const found = await wdGet('action=wbsearchentities&language=en&uselang=en&type=item&limit=6&search=' + encodeURIComponent(wanted.query));
  // desambiguacao pela descricao em ingles: filme vs serie vs jogo etc.
  const kind = wanted.type === 'series' ? /series/i : wanted.type === 'anime' ? /anime/i : /film|movie/i;
  const hit = (found.search || []).find((c) => kind.test(c.description || '')) || (found.search || [])[0];
  if (!hit) { console.log('sem resultado:', wanted.query); continue; }
  if (done.has(hit.label)) { console.log('ja na amostra:', wanted.query); continue; }
  const detail = await wdGet('action=wbgetentities&props=labels|claims&languages=pt|en&languagefallback=1&ids=' + hit.id);
  const entity = detail.entities[hit.id];
  const claims = entity.claims || {};
  const time = claims.P577?.[0]?.mainsnak?.datavalue?.value?.time || claims.P580?.[0]?.mainsnak?.datavalue?.value?.time || null;
  let creator = '';
  const creatorId = claims.P57?.[0]?.mainsnak?.datavalue?.value?.id || claims.P170?.[0]?.mainsnak?.datavalue?.value?.id;
  if (creatorId) {
    const c = await wdGet('action=wbgetentities&props=labels&languages=pt|en&languagefallback=1&ids=' + creatorId);
    creator = c.entities[creatorId]?.labels?.pt?.value || c.entities[creatorId]?.labels?.en?.value || '';
  }
  wikidataItems.push({
    external_id: hit.id,
    title: entity.labels?.pt?.value || entity.labels?.en?.value || hit.label,
    creator,
    category: wanted.category,
    release_year: time ? Number(time.slice(1, 5)) : null,
    source_url: 'https://www.wikidata.org/wiki/' + hit.id,
  });
  console.log('wikidata:', hit.id, wanted.query);
  await new Promise((r) => setTimeout(r, 1500));
}
const seen = new Set();
wikidataItems = wikidataItems.filter((i) => (seen.has(i.external_id) ? false : (seen.add(i.external_id), true)));
writeFileSync(join(dir, 'sample/wikidata-items.json'), JSON.stringify(wikidataItems, null, 2));

const albums = [];
for (const q of ALBUMS) {
  const url = 'https://musicbrainz.org/ws/2/release-group/?fmt=json&limit=1&query=' + encodeURIComponent(q);
  let res = await fetch(url, { headers: { ...UA, Accept: 'application/json' } });
  for (let attempt = 0; (res.status === 429 || res.status === 503) && attempt < 4; attempt++) {
    const wait = 5000 * (attempt + 1);
    console.log('MusicBrainz', res.status, '- aguardando', wait / 1000, 's');
    await new Promise((r) => setTimeout(r, wait));
    res = await fetch(url, { headers: { ...UA, Accept: 'application/json' } });
  }
  if (!res.ok) throw new Error('MusicBrainz HTTP ' + res.status);
  const data = await res.json();
  const rg = (data['release-groups'] || [])[0];
  if (rg) {
    albums.push({
      external_id: rg.id,
      title: rg.title,
      creator: (rg['artist-credit'] || []).map((a) => a.name).join(''),
      category: 'album',
      release_year: rg['first-release-date'] ? Number(rg['first-release-date'].slice(0, 4)) : null,
      source_url: 'https://musicbrainz.org/release-group/' + rg.id,
    });
    console.log('musicbrainz:', rg.id, rg.title);
  }
  await new Promise((r) => setTimeout(r, 1100)); // rate limit do MusicBrainz
}
writeFileSync(join(dir, 'sample/musicbrainz-albums.json'), JSON.stringify(albums, null, 2));
console.log('total:', wikidataItems.length + albums.length);
