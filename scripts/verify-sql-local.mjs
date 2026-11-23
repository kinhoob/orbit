import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
const db = new PGlite();
await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`);
const root=new URL('../',import.meta.url).pathname;
for (const file of fs.readdirSync(root+'supabase/migrations').sort()) {
 let sql=fs.readFileSync(root+'supabase/migrations/'+file,'utf8').replace('create extension if not exists pgcrypto;','');
 await db.exec(sql); console.log('Applied locally',file);
}
for (const name of ['account_universe.sql','discover_ranking.sql','private_social_helpers.sql','profile_favorites.sql','profile_stats.sql','follows.sql','reports.sql','messages.sql','conversation_mutes.sql','message_delivery.sql','typing_status.sql']) {
 if (!fs.existsSync(root+'supabase/tests/'+name)) continue;
 await db.exec(fs.readFileSync(root+'supabase/tests/'+name,'utf8')); console.log('Passed',name);
}
// PGlite is an embedded PostgreSQL engine, not the remote Supabase project.
console.log('Local PostgreSQL checks complete. Supabase API/Auth not exercised.');
await db.close();
