import test from 'node:test';
import assert from 'node:assert/strict';
import { GIF_MARKER, buildGifBody, parseGifBody, gifPreviewLabel, isGifUrl } from '../src/domain/gif.mjs';

// GIFs nas mensagens (pedido do Marco): o corpo carrega um marcador + URL de
// mídia do GIPHY. Só URLs https dos domínios do provedor são aceitas — a
// conversa nunca renderiza imagem de origem desconhecida.

test('monta corpo de GIF a partir de URL de mídia do GIPHY', () => {
  const body = buildGifBody('https://media.giphy.com/media/abc123/giphy.gif');
  assert.equal(body, `${GIF_MARKER}https://media.giphy.com/media/abc123/giphy.gif`);
});

test('aceita subdomínios de mídia do GIPHY', () => {
  assert.ok(isGifUrl('https://media2.giphy.com/media/xyz/200w.gif'));
  assert.ok(isGifUrl('https://i.giphy.com/xyz.gif'));
  assert.ok(isGifUrl('https://giphy.com/gifs/xyz'));
});

test('recusa URL http e domínios fora do GIPHY', () => {
  assert.equal(buildGifBody('http://media.giphy.com/media/abc/giphy.gif'), null);
  assert.equal(buildGifBody('https://exemplo.com/giphy.gif'), null);
  assert.equal(buildGifBody('https://falso-giphy.com.evil.example/x.gif'), null);
  assert.equal(buildGifBody('javascript:alert(1)'), null);
  assert.equal(buildGifBody(''), null);
});

test('extrai a URL de um corpo de GIF e ignora texto comum', () => {
  const body = buildGifBody('https://media.giphy.com/media/abc123/giphy.gif');
  assert.equal(parseGifBody(body), 'https://media.giphy.com/media/abc123/giphy.gif');
  assert.equal(parseGifBody('olá, tudo bem?'), null);
  assert.equal(parseGifBody('[GIF] não-é-url'), null);
  assert.equal(parseGifBody('[GIF] https://exemplo.com/x.gif'), null);
  assert.equal(parseGifBody(null), null);
  assert.equal(parseGifBody(undefined), null);
});

test('ida e volta: montar e extrair preserva a URL', () => {
  const url = 'https://media3.giphy.com/media/Q7ozWVYCR0nyW2rvPW/giphy.gif?cid=ecf05e47abc&rid=giphy.gif';
  assert.equal(parseGifBody(buildGifBody(url)), url);
});

test('prévia da conversa mostra rótulo GIF no lugar da URL', () => {
  assert.equal(gifPreviewLabel(buildGifBody('https://media.giphy.com/media/abc/giphy.gif')), 'GIF');
  assert.equal(gifPreviewLabel('mensagem de texto'), null);
});
