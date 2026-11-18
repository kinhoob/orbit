// BUSCA PÚBLICA AO VIVO EM PROVEDORES COM TERMOS COMPATÍVEIS
// Usada na tela Descobrir SOMENTE quando o Supabase não está configurado:
// não substitui o catálogo do usuário e a tela diz isso.
// Provedores (termos verificados em 18/11/2026, URLs em docs/visual-review.md):
// - TVmaze (séries/animes): API pública gratuita, sem chave, CORS liberado,
//   dados sob CC BY-SA — exige crédito com link ao TVmaze (feito na tela e em
//   cada item via sourceUrl) e ShareAlike.
// - Open Library (livros, Internet Archive): API pública para descoberta e
//   consulta humana de livros, sem chave; pedem registro do app (fica a cargo
//   do Marco), cache e nada de uso como backend em massa — busca sob demanda
//   do usuário com cache do react-query se enquadra.
// Nenhum provedor de imagem é usado: capas continuam ilustradas localmente.
// Álbuns (MusicBrainz: gratuito só para uso NÃO comercial), filmes e jogos
// (TMDB/IGDB/Steam sem termos compatíveis sem chave/contrato) ficam de fora
// até decisão do Marco. Detalhes em docs/visual-review.md.

export type PublicItem = {
  id: string;
  title: string;
  creator: string;
  category: string;
  releaseYear: number | null;
  source: 'TVmaze' | 'Open Library';
  sourceUrl: string;
};

export const PUBLIC_PROVIDER_CREDIT = 'TVmaze (CC BY-SA) e Open Library/Internet Archive';

type FetchLike = (url: string) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

const realFetch: FetchLike = (url) => fetch(url);

export async function searchPublicCatalog(search: string, category?: string, fetchImpl: FetchLike = realFetch): Promise<PublicItem[]> {
  const term = search.trim();
  if (term.length < 2) return [];
  const wantTv = !category || category === 'series' || category === 'anime';
  const wantBooks = !category || category === 'book';
  const jobs: Promise<PublicItem[]>[] = [];
  if (wantTv) jobs.push(searchTvmaze(term, fetchImpl));
  if (wantBooks) jobs.push(searchOpenLibrary(term, fetchImpl));
  const settled = await Promise.allSettled(jobs);
  return settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : [])).slice(0, 40);
}

type TvmazeShow = {
  id: number; name: string; type?: string; genres?: string[];
  premiered?: string | null; url?: string;
  network?: { name?: string } | null; webChannel?: { name?: string } | null;
};

async function searchTvmaze(term: string, fetchImpl: FetchLike): Promise<PublicItem[]> {
  const res = await fetchImpl(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(term)}`);
  if (!res.ok) return [];
  const rows = (await res.json()) as { show: TvmazeShow }[];
  return (Array.isArray(rows) ? rows : []).slice(0, 20).map(({ show }) => {
    const isAnime = show.type === 'Animation' || (show.genres ?? []).includes('Anime');
    return {
      id: `tvmaze-${show.id}`,
      title: show.name,
      creator: show.network?.name ?? show.webChannel?.name ?? '',
      category: isAnime ? 'anime' : 'series',
      releaseYear: show.premiered ? Number(show.premiered.slice(0, 4)) || null : null,
      source: 'TVmaze' as const,
      sourceUrl: show.url ?? `https://www.tvmaze.com/shows/${show.id}`,
    };
  }).filter((item) => item.title.length > 0);
}

type OlDoc = { key?: string; title?: string; author_name?: string[]; first_publish_year?: number };

async function searchOpenLibrary(term: string, fetchImpl: FetchLike): Promise<PublicItem[]> {
  const res = await fetchImpl(`https://openlibrary.org/search.json?q=${encodeURIComponent(term)}&limit=20&fields=key,title,author_name,first_publish_year`);
  if (!res.ok) return [];
  const data = (await res.json()) as { docs?: OlDoc[] };
  return (data.docs ?? []).map((doc) => ({
    id: `openlibrary-${doc.key ?? doc.title}`,
    title: doc.title ?? '',
    creator: (doc.author_name ?? [])[0] ?? '',
    category: 'book',
    releaseYear: doc.first_publish_year ?? null,
    source: 'Open Library' as const,
    sourceUrl: doc.key ? `https://openlibrary.org${doc.key}` : 'https://openlibrary.org',
  })).filter((item) => item.title.length > 0);
}
