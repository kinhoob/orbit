// CURADORIA LOCAL COM OBRAS REAIS
// Seleção fixa usada SOMENTE para demonstrar o mural da tela Início.
// Títulos, criadores e anos são reais. Nada é buscado ao vivo no app e a
// seleção não vem do Supabase nem simula o catálogo. Capas oficiais só entram
// quando a fonte permite o uso (álbums via Cover Art Archive/MusicBrainz, com
// atribuição em cada item); as demais usam capa ilustrada gerada localmente
// até haver um provedor licenciado. Detalhes em docs/visual-review.md.

/** @typedef {{ id: string, title: string, creator: string, category: string, releaseYear: number, coverAspectRatio: number, coverUrl: string | null, coverSource: string | null, coverLicense: string }} CuratedItem */

export const CURATED_MURAL_LABEL = 'Curadoria local';

const CAA = 'https://coverartarchive.org/release';

/** @type {CuratedItem[]} */
export const curatedMuralItems = [
  { id: 'film-interestelar', title: 'Interestelar', creator: 'Christopher Nolan', category: 'film', releaseYear: 2014, coverAspectRatio: 0.675, coverUrl: null, coverSource: null, coverLicense: 'Capa ilustrada gerada localmente; metadados reais, imagem oficial requer fonte licenciada' },
  { id: 'film-chihiro', title: 'A Viagem de Chihiro', creator: 'Hayao Miyazaki', category: 'film', releaseYear: 2001, coverAspectRatio: 0.705, coverUrl: null, coverSource: null, coverLicense: 'Capa ilustrada gerada localmente; metadados reais, imagem oficial requer fonte licenciada' },
  { id: 'film-retrato', title: 'Retrato de uma Jovem em Chamas', creator: 'Céline Sciamma', category: 'film', releaseYear: 2019, coverAspectRatio: 0.751, coverUrl: null, coverSource: null, coverLicense: 'Capa ilustrada gerada localmente; metadados reais, imagem oficial requer fonte licenciada' },
  { id: 'film-duna-2021', title: 'Duna', creator: 'Denis Villeneuve', category: 'film', releaseYear: 2021, coverAspectRatio: 0.674, coverUrl: null, coverSource: null, coverLicense: 'Capa ilustrada gerada localmente; metadados reais, imagem oficial requer fonte licenciada' },
  { id: 'film-central', title: 'Central do Brasil', creator: 'Walter Salles', category: 'film', releaseYear: 1998, coverAspectRatio: 0.72, coverUrl: null, coverSource: null, coverLicense: 'Capa ilustrada gerada localmente; metadados reais, imagem oficial requer fonte licenciada' },
  { id: 'film-cidade-de-deus', title: 'Cidade de Deus', creator: 'Fernando Meirelles', category: 'film', releaseYear: 2002, coverAspectRatio: 0.679, coverUrl: null, coverSource: null, coverLicense: 'Capa ilustrada gerada localmente; metadados reais, imagem oficial requer fonte licenciada' },
  { id: 'series-gambito', title: 'O Gambito da Rainha', creator: 'Scott Frank e Allan Scott', category: 'series', releaseYear: 2020, coverAspectRatio: 0.712, coverUrl: null, coverSource: null, coverLicense: 'Capa ilustrada gerada localmente; metadados reais, imagem oficial requer fonte licenciada' },
  { id: 'series-dark', title: 'Dark', creator: 'Baran bo Odar e Jantje Friese', category: 'series', releaseYear: 2017, coverAspectRatio: 0.712, coverUrl: null, coverSource: null, coverLicense: 'Capa ilustrada gerada localmente; metadados reais, imagem oficial requer fonte licenciada' },
  { id: 'anime-bebop', title: 'Cowboy Bebop', creator: 'Sunrise', category: 'anime', releaseYear: 1998, coverAspectRatio: 0.712, coverUrl: null, coverSource: null, coverLicense: 'Capa ilustrada gerada localmente; metadados reais, imagem oficial requer fonte licenciada' },
  { id: 'anime-fma', title: 'Fullmetal Alchemist: Brotherhood', creator: 'Bones', category: 'anime', releaseYear: 2009, coverAspectRatio: 0.712, coverUrl: null, coverSource: null, coverLicense: 'Capa ilustrada gerada localmente; metadados reais, imagem oficial requer fonte licenciada' },
  { id: 'game-stardew', title: 'Stardew Valley', creator: 'ConcernedApe', category: 'game', releaseYear: 2016, coverAspectRatio: 0.667, coverUrl: null, coverSource: null, coverLicense: 'Capa ilustrada gerada localmente; metadados reais, imagem oficial requer fonte licenciada' },
  { id: 'game-hades', title: 'Hades', creator: 'Supergiant Games', category: 'game', releaseYear: 2020, coverAspectRatio: 0.667, coverUrl: null, coverSource: null, coverLicense: 'Capa ilustrada gerada localmente; metadados reais, imagem oficial requer fonte licenciada' },
  { id: 'album-kind-of-blue', title: 'Kind of Blue', creator: 'Miles Davis', category: 'album', releaseYear: 1959, coverAspectRatio: 1, coverUrl: `${CAA}/e32a3f0b-1c19-3170-bb1c-650893774744/front-500`, coverSource: 'https://musicbrainz.org/release/e32a3f0b-1c19-3170-bb1c-650893774744', coverLicense: 'Arte de capa via Cover Art Archive / MusicBrainz' },
  { id: 'album-ram', title: 'Random Access Memories', creator: 'Daft Punk', category: 'album', releaseYear: 2013, coverAspectRatio: 0.99, coverUrl: `${CAA}/f6758afb-ecff-410e-8979-b131cfa3c6d3/front-500`, coverSource: 'https://musicbrainz.org/release/f6758afb-ecff-410e-8979-b131cfa3c6d3', coverLicense: 'Arte de capa via Cover Art Archive / MusicBrainz' },
  { id: 'album-ok-computer', title: 'OK Computer', creator: 'Radiohead', category: 'album', releaseYear: 1997, coverAspectRatio: 1, coverUrl: `${CAA}/6a09041b-0f79-3278-88d9-0552dd28d37f/front-500`, coverSource: 'https://musicbrainz.org/release/6a09041b-0f79-3278-88d9-0552dd28d37f', coverLicense: 'Arte de capa via Cover Art Archive / MusicBrainz' },
  { id: 'album-clube', title: 'Clube da Esquina', creator: 'Milton Nascimento e Lô Borges', category: 'album', releaseYear: 1972, coverAspectRatio: 1, coverUrl: `${CAA}/556ebda7-7ad3-4b21-b672-73722e486a00/front-500`, coverSource: 'https://musicbrainz.org/release/556ebda7-7ad3-4b21-b672-73722e486a00', coverLicense: 'Arte de capa via Cover Art Archive / MusicBrainz' },
  { id: 'album-getz-gilberto', title: 'Getz/Gilberto', creator: 'Stan Getz e João Gilberto', category: 'album', releaseYear: 1964, coverAspectRatio: 1, coverUrl: `${CAA}/1cb544a7-f1d6-4159-9661-8645cbaf257c/front-500`, coverSource: 'https://musicbrainz.org/release/1cb544a7-f1d6-4159-9661-8645cbaf257c', coverLicense: 'Arte de capa via Cover Art Archive / MusicBrainz' },
  { id: 'album-construcao', title: 'Construção', creator: 'Chico Buarque', category: 'album', releaseYear: 1971, coverAspectRatio: 1, coverUrl: `${CAA}/4ad7a356-d1d8-4367-8b33-dbb31c29517f/front-500`, coverSource: 'https://musicbrainz.org/release/4ad7a356-d1d8-4367-8b33-dbb31c29517f', coverLicense: 'Arte de capa via Cover Art Archive / MusicBrainz' },
  { id: 'book-cem-anos', title: 'Cem Anos de Solidão', creator: 'Gabriel García Márquez', category: 'book', releaseYear: 1967, coverAspectRatio: 0.572, coverUrl: null, coverSource: null, coverLicense: 'Capa ilustrada gerada localmente; metadados reais, imagem oficial requer fonte licenciada' },
  { id: 'book-nome-do-vento', title: 'O Nome do Vento', creator: 'Patrick Rothfuss', category: 'book', releaseYear: 2007, coverAspectRatio: 0.68, coverUrl: null, coverSource: null, coverLicense: 'Capa ilustrada gerada localmente; metadados reais, imagem oficial requer fonte licenciada' },
  { id: 'book-duna', title: 'Duna', creator: 'Frank Herbert', category: 'book', releaseYear: 1965, coverAspectRatio: 0.634, coverUrl: null, coverSource: null, coverLicense: 'Capa ilustrada gerada localmente; metadados reais, imagem oficial requer fonte licenciada' },
  { id: 'book-dom-casmurro', title: 'Dom Casmurro', creator: 'Machado de Assis', category: 'book', releaseYear: 1899, coverAspectRatio: 0.666, coverUrl: null, coverSource: null, coverLicense: 'Capa ilustrada gerada localmente; metadados reais, imagem oficial requer fonte licenciada' },
];
