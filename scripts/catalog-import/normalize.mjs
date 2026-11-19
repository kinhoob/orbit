// Normalizacao de registros de fontes CC0 para o formato de public.media_items.
// Puro e testavel: sem rede, sem Supabase.
// Proveniencia: external_source + external_id identificam a obra na fonte e
// sao a chave de deduplicacao (unique(external_source, external_id) no banco).

export const SOURCES = ['wikidata', 'musicbrainz'];

export function fromWikidata(item) {
  if (!item || !item.external_id || !/^Q\d+$/.test(item.external_id)) throw new Error('registro Wikidata sem QID');
  if (!item.title) throw new Error('registro Wikidata sem titulo: ' + item.external_id);
  return {
    external_source: 'wikidata',
    external_id: item.external_id,
    title: item.title,
    creator: item.creator || '',
    category: item.category,
    release_year: item.release_year ?? null,
    description: 'Importado do Wikidata (CC0): ' + (item.source_url || 'https://www.wikidata.org/wiki/' + item.external_id),
    cover_url: null,
  };
}

export function fromMusicbrainz(item) {
  if (!item || !item.external_id || !/^[0-9a-f-]{36}$/.test(item.external_id)) throw new Error('registro MusicBrainz sem MBID');
  if (!item.title) throw new Error('registro MusicBrainz sem titulo: ' + item.external_id);
  return {
    external_source: 'musicbrainz',
    external_id: item.external_id,
    title: item.title,
    creator: item.creator || '',
    category: item.category || 'album',
    release_year: item.release_year ?? null,
    description: 'Importado do MusicBrainz (CC0): ' + (item.source_url || 'https://musicbrainz.org/release-group/' + item.external_id),
    cover_url: null,
  };
}

export function dedupe(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    const key = row.external_source + ':' + row.external_id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function sortRows(rows) {
  return [...rows].sort((a, b) => (a.external_source + a.external_id).localeCompare(b.external_source + b.external_id));
}
