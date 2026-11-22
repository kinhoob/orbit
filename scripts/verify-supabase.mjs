// Read-only backend checks. Never prints keys, tokens, passwords or account rows.
// node --env-file=.env scripts/verify-supabase.mjs
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error('Configure the Supabase URL and publishable key in .env.');
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
let failures = 0;
function report(name, ok, detail = '') {
  console.log(`${ok ? 'OK' : 'FAIL'} ${name}${detail ? `: ${detail}` : ''}`);
  if (!ok) failures++;
}

const settingsResponse = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key }, signal: AbortSignal.timeout(15000) });
const settings = await settingsResponse.json();
report('Email authentication', settingsResponse.ok && settings.external?.email === true);
report('Email confirmation required', settingsResponse.ok && settings.mailer_autoconfirm === false);
for (const table of ['profiles', 'media_items', 'ratings', 'collections']) {
  const { error } = await client.from(table).select('*').limit(0);
  report(`Public read ${table}`, !error, error?.code ?? '');
}
for (const table of ['saved_items', 'friendships', 'notifications', 'account_settings']) {
  const { error, status } = await client.from(table).select('*').limit(0);
  report(`Private table ${table} rejects anonymous access`, !!error && [401, 403].includes(status), error?.code ?? '');
}
const catalog = await client.from('media_items').select('id', { count: 'exact', head: true });
report('Catalog available for onboarding', !catalog.error && (catalog.count ?? 0) >= 5, `${catalog.count ?? 'unknown'} works`);

const email = process.env.ORBIT_TEST_EMAIL;
const password = process.env.ORBIT_TEST_PASSWORD;
if (email && password) {
  try {
    const login = await client.auth.signInWithPassword({ email, password });
    if (login.error) throw login.error;
    const { data, error } = await client.auth.getUser();
    if (error) throw error;
    const id = data.user?.id;
    report('Authenticated and confirmed user', !!id && !!data.user.email_confirmed_at);
    if (id) {
      const profile = await client.from('profiles').select('id').eq('id', id).single();
      report('Own profile exists', !profile.error && profile.data?.id === id, profile.error?.code ?? '');
      const preferences = await client.from('account_settings').select('user_id,taste_genres,default_visibility,show_notification_badge,motion_preference').eq('user_id', id).single();
      report('Own preferences and taste migration', !preferences.error && preferences.data?.user_id === id, preferences.error?.code ?? '');
      for (const table of ['ratings', 'saved_items', 'collections', 'friendships', 'notifications']) {
        const response = await client.from(table).select('*').limit(0);
        report(`Authenticated access ${table}`, !response.error, response.error?.code ?? '');
      }
    }
  } catch (error) {
    report('Authenticated validation', false, typeof error?.code === 'string' ? error.code : 'Could not verify the account');
  } finally {
    await client.auth.signOut({ scope: 'local' });
  }
} else {
  console.log('NOT RUN: authenticated checks need an existing test account via ORBIT_TEST_EMAIL and ORBIT_TEST_PASSWORD in the terminal environment.');
}
process.exitCode = failures ? 1 : 0;
