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
// TMDB (filmes): adaptador DESATIVADO (esqueleto). Não é chamado em nenhum
// caminho, mesmo com chave configurada. Os termos
// (https://www.themoviedb.org/api-terms-of-use) exigem conta/chave e
// atribuição com logo, vedam uso comercial sem acordo escrito com o TMDB
// (seção 2, possíveis taxas; contato comercial oficial:
// sales@themoviedb.org) e vedam uso em aplicações de IA. O ORBIT é um
// produto comercial (decisão do Marco em 18/11/2026), então a ativação
// exige TODAS as condições: acordo comercial firmado pelo Marco, chave de
// API dele, atribuição com logo implementada na tela e uma mudança de código
// deliberada ligando o adaptador. Até lá, filmes não entram na busca ao vivo.
// Nenhum provedor de imagem é usado: capas continuam ilustradas localmente.
// Álbuns (MusicBrainz: API gratuita só para uso NÃO comercial; comercial
// exige plano MetaBrainz) ficam de fora até decisão do Marco; arte de álbuns
// não tem fonte com elegibilidade comercial verificada. Detalhes e URLs em
// docs/visual-review.md.

export type PublicItem = {
  id: string;
  title: string;
  creator: string;
  category: string;
  releaseYear: number | null;
  source: 'TVmaze' | 'Open Library' | 'TMDB';
  sourceUrl: string;
};

// Esqueleto desativado: a ativação é uma mudança de código deliberada
// (ver cabeçalho), nunca apenas variáveis de ambiente.

export const publicProviderCredit = () => 'TVmaze (CC BY-SA) e Open Library/Internet Archive';
export const publicCoverageLabel = () => 'séries, animes e livros';

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
  return settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
    .filter((item) => !category || item.category === category).slice(0, 40);
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

type TmdbMovie = { id: number; title?: string; release_date?: string | null };

async function searchTmdb(term: string, apiKey: string, fetchImpl: FetchLike): Promise<PublicItem[]> {
  const res = await fetchImpl(`https://api.themoviedb.org/3/search/movie?api_key=${encodeURIComponent(apiKey)}&language=pt-BR&include_adult=false&query=${encodeURIComponent(term)}`);
  if (!res.ok) return [];
  const data = (await res.json()) as { results?: TmdbMovie[] };
  return (data.results ?? []).slice(0, 20).map((movie) => ({
    id: `tmdb-${movie.id}`,
    title: movie.title ?? '',
    creator: '',
    category: 'film',
    releaseYear: movie.release_date ? Number(movie.release_date.slice(0, 4)) || null : null,
    source: 'TMDB' as const,
    sourceUrl: `https://www.themoviedb.org/movie/${movie.id}`,
  })).filter((item) => item.title.length > 0);
}

