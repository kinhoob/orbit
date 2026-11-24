import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AVATAR_MAX_BYTES,
  avatarExtension,
  avatarObjectPath,
  avatarPublicUrl,
  avatarTooLarge,
  base64ToBytes,
  isMissingAvatarBucket,
} from '../src/domain/avatar.mjs';

test('extensão aceita formatos comuns de imagem e cai para jpg sem MIME', () => {
  assert.equal(avatarExtension('image/jpeg'), 'jpg');
  assert.equal(avatarExtension('image/png'), 'png');
  assert.equal(avatarExtension('image/webp'), 'webp');
  assert.equal(avatarExtension('image/gif'), 'gif');
  assert.equal(avatarExtension('IMAGE/PNG'), 'png');
  assert.equal(avatarExtension(undefined), 'jpg');
  assert.equal(avatarExtension(''), 'jpg');
});

test('extensão recusa formatos fora da lista', () => {
  assert.equal(avatarExtension('image/svg+xml'), null);
  assert.equal(avatarExtension('application/pdf'), null);
  assert.equal(avatarExtension('text/html'), null);
});

test('caminho do objeto fica na pasta do próprio usuário', () => {
  assert.equal(avatarObjectPath('u-123', 'png'), 'u-123/avatar.png');
  assert.equal(avatarObjectPath('00000000-0000-4000-8000-000000000001', 'jpg'), '00000000-0000-4000-8000-000000000001/avatar.jpg');
});

test('URL pública ganha versão para quebrar cache e limpa parâmetros antigos', () => {
  assert.equal(avatarPublicUrl('https://x.supabase.co/storage/v1/object/public/avatars/u/avatar.jpg', 7), 'https://x.supabase.co/storage/v1/object/public/avatars/u/avatar.jpg?v=7');
  assert.equal(avatarPublicUrl('https://x.supabase.co/a.jpg?v=1', 9), 'https://x.supabase.co/a.jpg?v=9');
});

test('limite de tamanho do cliente', () => {
  assert.equal(avatarTooLarge(AVATAR_MAX_BYTES), false);
  assert.equal(avatarTooLarge(AVATAR_MAX_BYTES + 1), true);
  assert.equal(avatarTooLarge(undefined), false);
});

test('detecção de bucket ausente cobre as respostas do Storage', () => {
  assert.equal(isMissingAvatarBucket({ message: 'Bucket not found', statusCode: '404' }), true);
  assert.equal(isMissingAvatarBucket({ message: 'bucket not found' }), true);
  assert.equal(isMissingAvatarBucket({ message: 'row-level security violated' }), false);
  assert.equal(isMissingAvatarBucket(null), false);
  assert.equal(isMissingAvatarBucket({ statusCode: '404', message: 'Not found' }), false);
});

test('base64 decodifica para os bytes originais', () => {
  const bytes = base64ToBytes('aGVsbG8sIG9yYml0IQ==');
  assert.deepEqual([...bytes], [...new TextEncoder().encode('hello, orbit!')]);
  assert.deepEqual([...base64ToBytes('AQID')], [1, 2, 3]);
  assert.deepEqual([...base64ToBytes('AA==')], [0]);
  assert.deepEqual([...base64ToBytes('')], []);
  assert.deepEqual([...base64ToBytes('aGVs\nbG8s IG9yYml0IQ==')], [...new TextEncoder().encode('hello, orbit!')]);
});

test('base64 inválido falha em vez de produzir foto quebrada', () => {
  assert.throws(() => base64ToBytes('!!!!'), /inválido/);
});

test('inicial de fallback e pastas de remoção', async () => {
  const { avatarInitial, avatarObjectPaths } = await import('../src/domain/avatar.mjs');
  assert.equal(avatarInitial('  maria'), 'M');
  assert.equal(avatarInitial(''), '?');
  assert.equal(avatarInitial(null), '?');
  assert.deepEqual(avatarObjectPaths('u-1'), ['u-1/avatar.jpg', 'u-1/avatar.png', 'u-1/avatar.webp', 'u-1/avatar.gif']);
});
