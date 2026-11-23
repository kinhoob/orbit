// Mensagens de GIF (pedido do Marco: busca de GIFs real via provedor, com
// GIPHY escolhido depois do encerramento do Tenor). O GIF viaja como texto
// com marcador no corpo da mensagem — nenhuma mudança de banco — e a URL só
// é aceita dos domínios de mídia do provedor, para a conversa nunca renderizar
// imagem de origem desconhecida. Sem rede aqui: regras puras.

export const GIF_MARKER = '[GIF] ';
const GIF_HOST_SUFFIX = '.giphy.com';

/** Verdadeiro para URLs de mídia do GIPHY (media.giphy.com, media0-4.giphy.com, i.giphy.com). */
export function isGifUrl(url) {
  try {
    const u = new URL(String(url || ''));
    if (u.protocol !== 'https:') return false;
    const host = u.hostname.toLowerCase();
    return host === 'giphy.com' || host.endsWith(GIF_HOST_SUFFIX);
  } catch {
    return false;
  }
}

/** Corpo de mensagem pronto para enviar, ou null quando a URL não é de GIF confiável. */
export function buildGifBody(url) {
  const clean = String(url || '').trim();
  if (!isGifUrl(clean)) return null;
  const body = `${GIF_MARKER}${clean}`;
  return body.length <= 2000 ? body : null;
}

/** Extrai a URL de GIF de um corpo de mensagem, ou null quando é texto comum. */
export function parseGifBody(body) {
  const text = String(body || '');
  if (!text.startsWith(GIF_MARKER)) return null;
  const url = text.slice(GIF_MARKER.length).trim();
  return isGifUrl(url) ? url : null;
}

/** Rótulo curto para prévias de conversa (lista de mensagens). */
export function gifPreviewLabel(body) {
  return parseGifBody(body) ? 'GIF' : null;
}
