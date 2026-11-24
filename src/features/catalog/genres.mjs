// Taxonomia de gêneros e estilos da escolha de gostos (pedido do Marco em
// 21/11/2026): opções completas por categoria, com busca. Guiam sugestões e
// descobertas; a compatibilidade continua saindo só das notas reais.
export const genres = [
  // Filmes
  { id: 'film-acao', category: 'film', label: 'Ação' },
  { id: 'film-animacao', category: 'film', label: 'Animação' },
  { id: 'film-aventura', category: 'film', label: 'Aventura' },
  { id: 'film-comedia', category: 'film', label: 'Comédia' },
  { id: 'film-crime', category: 'film', label: 'Crime' },
  { id: 'film-documentario', category: 'film', label: 'Documentário' },
  { id: 'film-drama', category: 'film', label: 'Drama' },
  { id: 'film-fantasia', category: 'film', label: 'Fantasia' },
  { id: 'film-faroeste', category: 'film', label: 'Faroeste' },
  { id: 'film-ficcao', category: 'film', label: 'Ficção científica' },
  { id: 'film-guerra', category: 'film', label: 'Guerra' },
  { id: 'film-historia', category: 'film', label: 'História' },
  { id: 'film-misterio', category: 'film', label: 'Mistério' },
  { id: 'film-musical', category: 'film', label: 'Musical' },
  { id: 'film-romance', category: 'film', label: 'Romance' },
  { id: 'film-suspense', category: 'film', label: 'Suspense' },
  { id: 'film-terror', category: 'film', label: 'Terror' },
  // Séries
  { id: 'series-acao', category: 'series', label: 'Ação e aventura' },
  { id: 'series-animacao', category: 'series', label: 'Animação' },
  { id: 'series-comedia', category: 'series', label: 'Comédia' },
  { id: 'series-crime', category: 'series', label: 'Crime' },
  { id: 'series-documentario', category: 'series', label: 'Documentário' },
  { id: 'series-drama', category: 'series', label: 'Drama' },
  { id: 'series-fantasia', category: 'series', label: 'Fantasia' },
  { id: 'series-ficcao', category: 'series', label: 'Ficção científica' },
  { id: 'series-misterio', category: 'series', label: 'Mistério' },
  { id: 'series-reality', category: 'series', label: 'Reality' },
  { id: 'series-romance', category: 'series', label: 'Romance' },
  { id: 'series-suspense', category: 'series', label: 'Suspense' },
  { id: 'series-terror', category: 'series', label: 'Terror' },
  // Animes
  { id: 'anime-acao', category: 'anime', label: 'Ação' },
  { id: 'anime-aventura', category: 'anime', label: 'Aventura' },
  { id: 'anime-comedia', category: 'anime', label: 'Comédia' },
  { id: 'anime-drama', category: 'anime', label: 'Drama' },
  { id: 'anime-esporte', category: 'anime', label: 'Esporte' },
  { id: 'anime-fantasia', category: 'anime', label: 'Fantasia' },
  { id: 'anime-ficcao', category: 'anime', label: 'Ficção científica' },
  { id: 'anime-isekai', category: 'anime', label: 'Isekai' },
  { id: 'anime-mecha', category: 'anime', label: 'Mecha' },
  { id: 'anime-misterio', category: 'anime', label: 'Mistério' },
  { id: 'anime-romance', category: 'anime', label: 'Romance' },
  { id: 'anime-seinen', category: 'anime', label: 'Seinen' },
  { id: 'anime-shoujo', category: 'anime', label: 'Shoujo' },
  { id: 'anime-shounen', category: 'anime', label: 'Shounen' },
  { id: 'anime-slice', category: 'anime', label: 'Slice of life' },
  { id: 'anime-suspense', category: 'anime', label: 'Suspense' },
  { id: 'anime-terror', category: 'anime', label: 'Terror' },
  // Músicas e álbuns dividem os mesmos estilos
  ...['music', 'album'].flatMap(category => [
    { id: `${category}-bossa`, category, label: 'Bossa nova' },
    { id: `${category}-classica`, category, label: 'Clássica' },
    { id: `${category}-eletronica`, category, label: 'Eletrônica' },
    { id: `${category}-forro`, category, label: 'Forró' },
    { id: `${category}-funk`, category, label: 'Funk' },
    { id: `${category}-gospel`, category, label: 'Gospel' },
    { id: `${category}-hiphop`, category, label: 'Hip hop' },
    { id: `${category}-indie`, category, label: 'Indie' },
    { id: `${category}-jazz`, category, label: 'Jazz' },
    { id: `${category}-metal`, category, label: 'Metal' },
    { id: `${category}-mpb`, category, label: 'MPB' },
    { id: `${category}-pagode`, category, label: 'Pagode' },
    { id: `${category}-pop`, category, label: 'Pop' },
    { id: `${category}-rap`, category, label: 'Rap' },
    { id: `${category}-reggae`, category, label: 'Reggae' },
    { id: `${category}-rock`, category, label: 'Rock' },
    { id: `${category}-samba`, category, label: 'Samba' },
    { id: `${category}-sertanejo`, category, label: 'Sertanejo' },
    { id: `${category}-soul`, category, label: 'Soul' },
  ]),
  // Livros
  { id: 'book-autoajuda', category: 'book', label: 'Autoajuda' },
  { id: 'book-biografia', category: 'book', label: 'Biografia' },
  { id: 'book-classicos', category: 'book', label: 'Clássicos' },
  { id: 'book-fantasia', category: 'book', label: 'Fantasia' },
  { id: 'book-ficcao', category: 'book', label: 'Ficção' },
  { id: 'book-ficcao-cientifica', category: 'book', label: 'Ficção científica' },
  { id: 'book-historia', category: 'book', label: 'História' },
  { id: 'book-literatura', category: 'book', label: 'Literatura brasileira' },
  { id: 'book-misterio', category: 'book', label: 'Mistério' },
  { id: 'book-poesia', category: 'book', label: 'Poesia' },
  { id: 'book-quadrinhos', category: 'book', label: 'Quadrinhos' },
  { id: 'book-romance', category: 'book', label: 'Romance' },
  { id: 'book-suspense', category: 'book', label: 'Suspense' },
  { id: 'book-terror', category: 'book', label: 'Terror' },
  // Jogos
  { id: 'game-acao', category: 'game', label: 'Ação' },
  { id: 'game-aventura', category: 'game', label: 'Aventura' },
  { id: 'game-corrida', category: 'game', label: 'Corrida' },
  { id: 'game-esporte', category: 'game', label: 'Esporte' },
  { id: 'game-estrategia', category: 'game', label: 'Estratégia' },
  { id: 'game-indie', category: 'game', label: 'Indie' },
  { id: 'game-luta', category: 'game', label: 'Luta' },
  { id: 'game-plataforma', category: 'game', label: 'Plataforma' },
  { id: 'game-puzzle', category: 'game', label: 'Puzzle' },
  { id: 'game-rpg', category: 'game', label: 'RPG' },
  { id: 'game-simulacao', category: 'game', label: 'Simulação' },
  { id: 'game-terror', category: 'game', label: 'Terror' },
];

// Mapa direto (sem normalize/regex unicode): funciona também em runtimes sem
// ICU, como builds mínimas do Node, e cobre os acentos usados nos rótulos.
const ACCENT_FALLBACK = { à: 'a', á: 'a', â: 'a', ã: 'a', ä: 'a', ç: 'c', è: 'e', é: 'e', ê: 'e', ë: 'e', ì: 'i', í: 'i', î: 'i', ï: 'i', ñ: 'n', ò: 'o', ó: 'o', ô: 'o', õ: 'o', ö: 'o', ù: 'u', ú: 'u', û: 'u', ü: 'u' };
const fold = value => value.toLowerCase()
  .replace(/[àáâãäçèéêëìíîïñòóôõöùúûü]/g, letter => ACCENT_FALLBACK[letter]);

export function searchGenres(query) {
  const term = fold(query.trim());
  if (!term) return genres;
  return genres.filter(genre => fold(genre.label).includes(term));
}

export function genresByCategory(list) {
  const groups = new Map();
  for (const genre of list) {
    if (!groups.has(genre.category)) groups.set(genre.category, []);
    groups.get(genre.category).push(genre);
  }
  return groups;
}

/** Rótulos de exibição dos gêneros de uma obra, na ordem salva, sem duplicar
 * rótulos e ignorando ids desconhecidos ou fora da categoria da obra. */
export function genreLabelsFor(ids, category) {
  if (!Array.isArray(ids)) return [];
  const seen = new Set();
  const labels = [];
  for (const id of ids) {
    const genre = genres.find((g) => g.id === id && (!category || g.category === category));
    if (genre && !seen.has(genre.label)) {
      seen.add(genre.label);
      labels.push(genre.label);
    }
  }
  return labels;
}
