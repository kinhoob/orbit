import type { Session, SupabaseClient } from '@supabase/supabase-js';

// A session restored from storage is only a candidate until Auth verifies it.
export async function verifySession(client: SupabaseClient, candidate: Session): Promise<Session> {
  const { data, error } = await client.auth.getUser(candidate.access_token);
  if (error) throw error;
  const user = data.user;
  if (!user || user.id !== candidate.user.id || user.is_anonymous) throw new Error('Invalid session');
  if (user.email && !user.email_confirmed_at) throw new Error('Email confirmation required');
  return { ...candidate, user };
}
