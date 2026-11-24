-- Foto de perfil no Storage (pedido do Marco em 23/11/2026): bucket público
-- de avatares, com escrita restrita à pasta do próprio usuário. A leitura é
-- pública porque a foto aparece para qualquer visitante do perfil, como o
-- restante do cabeçalho. Não muda tabelas nem dados existentes; profiles
-- .avatar_url já existia e passa a ser preenchido pelo app.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Leitura pública das fotos (visitante anônimo também vê o perfil).
drop policy if exists avatars_read on storage.objects;
create policy avatars_read on storage.objects
for select using (bucket_id = 'avatars');

-- Escrita só na pasta do próprio usuário: <uid>/avatar.<ext>.
drop policy if exists avatars_insert on storage.objects;
create policy avatars_insert on storage.objects
for insert to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_update on storage.objects;
create policy avatars_update on storage.objects
for update to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_delete on storage.objects;
create policy avatars_delete on storage.objects
for delete to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
