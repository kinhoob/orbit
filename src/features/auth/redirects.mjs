// Pure routing rules, shared by signup, resend and recovery.
export class AuthRedirectError extends Error {}
export function authRedirectUrl({ platform, configured, origin, expoGo = false, recovery = false }) {
  if (platform !== 'web' && expoGo && !configured?.trim()) throw new AuthRedirectError('No Expo Go, confirme o endereço de retorno desta sessão ou use um build de desenvolvimento. Nenhum e-mail foi enviado.');
  const fallback = platform === 'web' ? (origin ? `${origin}/auth/callback` : '') : 'orbit://auth/callback';
  const url = new URL(configured?.trim() || fallback);
  if (platform === 'web') {
    if (!['http:', 'https:'].includes(url.protocol) || url.pathname !== '/auth/callback') throw new Error('Invalid web auth callback');
    if (url.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('HTTPS required');
  } else if (expoGo) {
    if (!['exp:', 'exps:'].includes(url.protocol) || !url.hostname || url.hostname.includes('*') || url.pathname !== '/--/auth/callback') throw new AuthRedirectError('O retorno do Expo Go deve usar o endereço exp:// ou exps:// real desta sessão, com /--/auth/callback.');
  } else if (url.protocol !== 'orbit:' || url.hostname !== 'auth' || url.pathname !== '/callback') throw new Error('Invalid native auth callback');
  if (url.username || url.password || url.hash || url.search) throw new Error('Callback must not contain credentials, query or fragment');
  if (recovery) url.searchParams.set('flow', 'recovery');
  return url.toString();
}

export async function acceptAuthCallback(client, rawUrl) {
  const url = new URL(rawUrl);
  const hash = new URLSearchParams(url.hash.slice(1));
  if (url.searchParams.has('error') || hash.has('error')) throw new Error('Auth link rejected');
  const code = url.searchParams.get('code');
  const access_token = hash.get('access_token');
  const refresh_token = hash.get('refresh_token');
  const response = code ? await client.auth.exchangeCodeForSession(code)
    : access_token && refresh_token ? await client.auth.setSession({ access_token, refresh_token }) : null;
  if (!response || response.error || !response.data?.session) throw new Error('Invalid auth link');
  const { data, error } = await client.auth.getUser(response.data.session.access_token);
  if (error || !data.user || data.user.id !== response.data.session.user.id || data.user.is_anonymous
    || (data.user.email && !data.user.email_confirmed_at)) throw new Error('Unverified auth link');
  return { recovery: url.searchParams.get('flow') === 'recovery' || hash.get('type') === 'recovery' || url.searchParams.get('type') === 'recovery' };
}
