// Gera supabase/seed_catalog_cc0.sql a partir das amostras normalizadas.
// Idempotente: insert ... on conflict (external_source, external_id) do
// update, entao rodar de novo atualiza os mesmos itens sem duplicar.
// A seed NAO e aplicada aqui; aplicar ao banco e um passo separado do Marco.
// Uso: node scripts/catalog-import/generate-seed.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { fromWikidata, fromMusicbrainz, dedupe, sortRows } from './normalize.mjs';

const dir = dirname(fileURLToPath(import.meta.url));
const root = join(dir, '..', '..');

const wikidata = JSON.parse(readFileSync(join(dir, 'sample/wikidata-items.json'), 'utf8')).map(fromWikidata);
const albums = JSON.parse(readFileSync(join(dir, 'sample/musicbrainz-albums.json'), 'utf8')).map(fromMusicbrainz);
const rows = sortRows(dedupe([...wikidata, ...albums]));

const lit = (v) => (v === null || v === undefined ? 'null' : "'" + String(v).replace(/'/g, "''") + "'");
const num = (v) => (v === null || v === undefined ? 'null' : String(v));

const lines = rows.map((r) =>
  `insert into public.media_items (title, creator, category, description, cover_url, release_year, external_source, external_id)\n` +
  `values (${lit(r.title)}, ${lit(r.creator)}, ${lit(r.category)}::public.media_category, ${lit(r.description)}, null, ${num(r.release_year)}, ${lit(r.external_source)}, ${lit(r.external_id)})\n` +
  `on conflict (external_source, external_id) do update set\n` +
  `  title = excluded.title, creator = excluded.creator, category = excluded.category,\n` +
  `  description = excluded.description, release_year = excluded.release_year;`
);

const out = `-- Catalogo CC0 de demonstracao (AMOSTRA real, nao o catalogo completo).
-- Fontes: Wikidata (CC0, https://www.wikidata.org/wiki/Wikidata:Licensing) e
-- MusicBrainz (CC0, https://musicbrainz.org/doc/MusicBrainz_Database/Download).
-- Capas continuam ilustradas (cover_url null): nenhuma fonte de arte tem
-- licenca comercial verificada. Regenerar: node scripts/catalog-import/generate-seed.mjs
begin;

${lines.join('\n\n')}

commit;
-- ${rows.length} obras reais na amostra (${wikidata.length} Wikidata + ${albums.length} MusicBrainz).
`;
writeFileSync(join(root, 'supabase/seed_catalog_cc0.sql'), out);
console.log('seed gerada:', rows.length, 'obras');
