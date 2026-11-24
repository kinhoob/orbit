import * as ImagePicker from 'expo-image-picker';
import { requireSupabase } from '../../lib/supabase';
import {
  AVATAR_BUCKET,
  avatarExtension,
  avatarObjectPath,
  avatarPublicUrl,
  avatarTooLarge,
  base64ToBytes,
  isMissingAvatarBucket,
} from '../../domain/avatar.mjs';

// Foto de perfil (pedido do Marco em 23/11/2026): a pessoa escolhe uma imagem
// da galeria, cortada em quadrado, e ela vai para o bucket público `avatars`
// na pasta do próprio usuário. A migration 20261123060000_profile_avatars.sql
// fica em revisão no PR; enquanto o bucket não existe no banco, a tela
// explica que a foto chega com a próxima atualização — nunca finge sucesso.

let bucketMissing = false;

/** Verdadeiro quando o Storage respondeu que o bucket de avatares ainda não existe. */
export function avatarsBucketMissing(): boolean {
  return bucketMissing;
}

export type AvatarPickResult = 'uploaded' | 'cancelled';

/**
 * Abre a galeria, envia a foto escolhida e grava a URL pública em
 * profiles.avatar_url. Lança Error com mensagem de domínio para a tela
 * traduzir: 'cancelled' não lança, retorna 'cancelled'.
 */
export async function pickAndUploadAvatar(userId: string): Promise<AvatarPickResult> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
    base64: true,
  });
  const asset = result.canceled ? undefined : result.assets?.[0];
  if (!asset) return 'cancelled';
  const extension = avatarExtension(asset.mimeType || '');
  if (!extension) throw new Error('unsupported-format');
  if (!asset.base64) throw new Error('read-failed');
  const bytes = base64ToBytes(asset.base64);
  if (avatarTooLarge(bytes.length)) throw new Error('too-large');

  const client = requireSupabase();
  const path = avatarObjectPath(userId, extension);
  const contentType = asset.mimeType || 'image/jpeg';
  const { error: uploadError } = await client.storage.from(AVATAR_BUCKET).upload(path, bytes, { contentType, upsert: true, cacheControl: '3600' });
  if (uploadError) {
    if (isMissingAvatarBucket(uploadError)) { bucketMissing = true; throw new Error('bucket-missing'); }
    throw new Error('upload-failed');
  }
  const { data } = client.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  const url = avatarPublicUrl(data.publicUrl);
  const { error: updateError } = await client.from('profiles').update({ avatar_url: url }).eq('id', userId).select('id').single();
  if (updateError) throw new Error('profile-update-failed');
  return 'uploaded';
}
