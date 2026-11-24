// Foto de perfil (pedido do Marco em 23/11/2026): o avatar deixa de ser só a
// inicial e passa a ser uma foto escolhida da galeria, guardada no bucket
// público `avatars` do Storage. Cada pessoa escreve só dentro da própria
// pasta (id do usuário), garantido pelas políticas da migration
// 20261123060000_profile_avatars.sql — este módulo só organiza nomes, tipos
// e limites no cliente.

/** Tamanho máximo aceito do arquivo decodificado, em bytes (5 MB). */
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

/** Bucket público de fotos de perfil. */
export const AVATAR_BUCKET = 'avatars';

const EXTENSIONS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

/**
 * Extensão aceita para a foto, a partir do MIME informado pelo seletor de
 * imagens. Retorna null para formatos fora da lista (o seletor já limita a
 * imagens; isto é uma segunda trava).
 */
export function avatarExtension(mimeType) {
  if (!mimeType) return 'jpg';
  return EXTENSIONS[mimeType.toLowerCase()] || null;
}

/** Caminho do objeto no bucket: pasta do usuário, nome fixo por formato (upsert). */
export function avatarObjectPath(userId, extension) {
  return `${userId}/avatar.${extension}`;
}

/** URL pública com quebra de cache, para a troca de foto aparecer na hora. */
export function avatarPublicUrl(baseUrl, version = Date.now()) {
  const clean = String(baseUrl).replace(/[?#].*$/, '');
  return `${clean}?v=${version}`;
}

/** Verdadeiro quando o arquivo ultrapassa o limite do cliente. */
export function avatarTooLarge(bytes) {
  return typeof bytes === 'number' && bytes > AVATAR_MAX_BYTES;
}

/**
 * Verdadeiro quando o Storage respondeu que o bucket de avatares ainda não
 * existe (migration em revisão). Segue o mesmo contrato de
 * isMissingTableError: a interface explica o estado em vez de fingir sucesso.
 */
export function isMissingAvatarBucket(error) {
  if (!error) return false;
  const message = String(error.message || error.error || '').toLowerCase();
  const status = String(error.statusCode || error.status || '');
  return message.includes('bucket not found') || message.includes('bucket não encontrado') || (status === '404' && message.includes('bucket'));
}

const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Decodifica base64 para bytes sem depender de atob/Buffer — o React Native
 * do Expo Go não tem nenhum dos dois. Ignora quebras de linha e espaços.
 */
export function base64ToBytes(base64) {
  const clean = String(base64).replace(/\s+/g, '');
  const length = clean.endsWith('==') ? clean.length - 2 : clean.endsWith('=') ? clean.length - 1 : clean.length;
  const bytes = new Uint8Array(Math.floor((length * 3) / 4));
  let byteIndex = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const chunk = [0, 1, 2, 3].map((offset) => {
      const char = clean[i + offset];
      return char === undefined || char === '=' ? 0 : B64_ALPHABET.indexOf(char);
    });
    if (chunk.some((value) => value === -1)) throw new Error('Conteúdo da imagem inválido.');
    const triple = (chunk[0] << 18) | (chunk[1] << 12) | (chunk[2] << 6) | chunk[3];
    if (byteIndex < bytes.length) bytes[byteIndex++] = (triple >> 16) & 0xff;
    if (byteIndex < bytes.length) bytes[byteIndex++] = (triple >> 8) & 0xff;
    if (byteIndex < bytes.length) bytes[byteIndex++] = triple & 0xff;
  }
  return bytes;
}

/** Inicial maiúscula usada quando não há foto; '?' sem nome. */
export function avatarInitial(name) {
  const trimmed = String(name ?? '').trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?';
}

/**
 * Pasta do usuário no bucket: todos os formatos possíveis de avatar, para a
 * remoção apagar o arquivo qualquer que seja a extensão enviada antes.
 */
export function avatarObjectPaths(userId) {
  return Object.values(EXTENSIONS).filter((value, index, all) => all.indexOf(value) === index).map((extension) => avatarObjectPath(userId, extension));
}
