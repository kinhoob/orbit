// DADOS DE DEMONSTRAÇÃO
// Itens locais usados SOMENTE para avaliar o layout do mural da tela Início.
// Não vêm do Supabase, não simulam integração com o banco e não representam
// o catálogo real. Remover ou substituir quando o mural usar dados reais.

export type DemoMuralItem = {
  id: string;
  title: string;
  category: string;
  releaseYear: number | null;
  /** Proporção largura/altura da capa (varia de propósito para o masonry). */
  coverAspectRatio: number;
  /** Tom da capa de demonstração: chave de cor dos tokens existentes. */
  tone: 'accent' | 'secondary' | 'primary';
};

export const DEMO_MURAL_LABEL = 'Demonstração';

export const demoMuralItems: DemoMuralItem[] = [
  { id: 'demo-01', title: 'A Viagem de Chihiro', category: 'anime', releaseYear: 2001, coverAspectRatio: 0.72, tone: 'accent' },
  { id: 'demo-02', title: 'Kind of Blue', category: 'album', releaseYear: 1959, coverAspectRatio: 1, tone: 'primary' },
  { id: 'demo-03', title: 'Cem Anos de Solidão', category: 'book', releaseYear: 1967, coverAspectRatio: 0.66, tone: 'secondary' },
  { id: 'demo-04', title: 'Dark', category: 'series', releaseYear: 2017, coverAspectRatio: 0.78, tone: 'primary' },
  { id: 'demo-05', title: 'Blade Runner 2049', category: 'film', releaseYear: 2017, coverAspectRatio: 0.7, tone: 'accent' },
  { id: 'demo-06', title: 'Stardew Valley', category: 'game', releaseYear: 2016, coverAspectRatio: 1.15, tone: 'secondary' },
  { id: 'demo-07', title: 'Tropicália', category: 'music', releaseYear: 1968, coverAspectRatio: 0.95, tone: 'accent' },
  { id: 'demo-08', title: 'O Nome do Vento', category: 'book', releaseYear: 2007, coverAspectRatio: 0.62, tone: 'primary' },
  { id: 'demo-09', title: 'Cowboy Bebop', category: 'anime', releaseYear: 1998, coverAspectRatio: 0.8, tone: 'secondary' },
  { id: 'demo-10', title: 'Amor e Sampa', category: 'music', releaseYear: 2023, coverAspectRatio: 1.05, tone: 'accent' },
  { id: 'demo-11', title: 'O Gambito da Rainha', category: 'series', releaseYear: 2020, coverAspectRatio: 0.74, tone: 'secondary' },
  { id: 'demo-12', title: 'Interestelar', category: 'film', releaseYear: 2014, coverAspectRatio: 0.68, tone: 'primary' },
  { id: 'demo-13', title: 'Hades', category: 'game', releaseYear: 2020, coverAspectRatio: 1.1, tone: 'accent' },
  { id: 'demo-14', title: 'Random Access Memories', category: 'album', releaseYear: 2013, coverAspectRatio: 1, tone: 'secondary' },
  { id: 'demo-15', title: 'Duna', category: 'book', releaseYear: 1965, coverAspectRatio: 0.64, tone: 'accent' },
  { id: 'demo-16', title: 'Retrato de uma Jovem em Chamas', category: 'film', releaseYear: 2019, coverAspectRatio: 0.71, tone: 'secondary' },
];
