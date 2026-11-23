import Constants from 'expo-constants';

// Cliente da busca de GIFs do GIPHY (provedor escolhido após o encerramento
// do Tenor: https://support.google.com/tenor/answer/10455265). Conta de
// teste do ORBIT, chave beta gratuita (100 req/hora — limites em
// https://developers.giphy.com/docs/api/). A chave NÃO fica no repositório:
// vem de EXPO_PUBLIC_GIPHY_API_KEY (.env local, gitignored) ou de
// extra.giphyApiKey no app.json. Sem chave configurada, a busca responde
// indisponível e a interface explica — nunca resultados inventados. Os termos
// do GIPHY exigem a atribuição "Powered By GIPHY", exibida no seletor.

export type Gif = {
  id: string;
  /** URL do GIF enviada na mensagem (largura fixa ~200px). */
  url: string;
  /** Prévia leve para a grade do seletor. */
  preview: string;
  title: string;
  width: number;
  height: number;
};

export type GifResult =
  | { status: 'ok'; gifs: Gif[] }
  | { status: 'unconfigured' }
  | { status: 'error' };

function apiKey(): string {
  const fromEnv = typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_GIPHY_API_KEY : undefined;
  const fromExtra = (Constants.expoConfig?.extra as { giphyApiKey?: string } | undefined)?.giphyApiKey;
  return (fromEnv || fromExtra || '').trim();
}

export function giphyConfigured(): boolean {
  return !!apiKey();
}

type GiphyImage = { url?: string; width?: string; height?: string };
type GiphyItem = {
  id?: string;
  title?: string;
  images?: { fixed_width?: GiphyImage; fixed_width_small?: GiphyImage; preview_gif?: GiphyImage };
};

function normalize(item: GiphyItem): Gif | null {
  const full = item.images?.fixed_width;
  if (!item.id || !full?.url) return null;
  const preview = item.images?.fixed_width_small?.url || item.images?.preview_gif?.url || full.url;
  return {
    id: item.id,
    url: full.url,
    preview,
    title: (item.title || 'GIF').trim() || 'GIF',
    width: Number(full.width) || 200,
    height: Number(full.height) || 200,
  };
}

async function fetchGifs(path: string): Promise<GifResult> {
  const key = apiKey();
  if (!key) return { status: 'unconfigured' };
  try {
    const res = await fetch(`https://api.giphy.com/v1/gifs/${path}${path.includes('?') ? '&' : '?'}api_key=${encodeURIComponent(key)}&limit=24&rating=pg-13&bundle=messaging_non_clips`);
    if (!res.ok) return { status: 'error' };
    const json = (await res.json()) as { data?: GiphyItem[] };
    const gifs = (json.data || []).map(normalize).filter((g): g is Gif => !!g);
    return { status: 'ok', gifs };
  } catch {
    return { status: 'error' };
  }
}

/** Busca GIFs pelo termo; termo vazio cai nos em alta. */
export function searchGifs(query: string): Promise<GifResult> {
  const q = query.trim();
  if (!q) return trendingGifs();
  return fetchGifs(`search?q=${encodeURIComponent(q)}`);
}

/** GIFs em alta, mostrados quando o seletor abre. */
export function trendingGifs(): Promise<GifResult> {
  return fetchGifs('trending');
}
