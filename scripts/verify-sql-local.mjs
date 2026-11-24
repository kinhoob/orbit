import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
const db = new PGlite();
await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`);
// Espelho mínimo do Storage do Supabase para as migrations de bucket/objeto:
// PGlite não traz o schema storage. RLS ligada para exercitar as políticas.
await db.exec(`create schema storage; create table storage.buckets(id text primary key, name text not null, public boolean not null default false, created_at timestamptz not null default now()); create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text not null references storage.buckets(id), name text not null, owner uuid, created_at timestamptz not null default now(), unique(bucket_id,name)); create function storage.foldername(name text) returns text[] language sql immutable as $$select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1]$$; alter table storage.objects enable row level security; grant usage on schema storage to anon,authenticated; grant select,insert,update,delete on storage.objects to anon,authenticated;`);
const root=new URL('../',import.meta.url).pathname;
for (const file of fs.readdirSync(root+'supabase/migrations').sort()) {
 let sql=fs.readFileSync(root+'supabase/migrations/'+file,'utf8').replace('create extension if not exists pgcrypto;','');
 await db.exec(sql); console.log('Applied locally',file);
}
for (const name of ['account_universe.sql','discover_ranking.sql','private_social_helpers.sql','profile_favorites.sql','profile_stats.sql','follows.sql','reports.sql','messages.sql','conversation_mutes.sql','message_delivery.sql','typing_status.sql','profile_achievements.sql','level_cosmetics.sql','media_genres.sql','profile_avatars.sql']) {
 if (!fs.existsSync(root+'supabase/tests/'+name)) continue;
 await db.exec(fs.readFileSync(root+'supabase/tests/'+name,'utf8')); console.log('Passed',name);
}
// PGlite is an embedded PostgreSQL engine, not the remote Supabase project.
console.log('Local PostgreSQL checks complete. Supabase API/Auth not exercised.');
await db.close();
