-- Disposable local/dev DB only. Fixtures roll back. Never run on production.
-- Fotos de perfil no Storage: bucket público, escrita só na pasta do dono (23/11/2026).
begin;
insert into auth.users(id) values
 ('d1111111-1111-4111-8111-111111111111'),
 ('d2222222-2222-4222-8222-222222222222');

-- Bucket criado pela migration, público para leitura.
do $$ begin
 if not exists (select 1 from storage.buckets where id='avatars' and public) then raise exception 'avatars bucket missing or not public'; end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub','d1111111-1111-4111-8111-111111111111',true);

-- O dono escreve e atualiza dentro da própria pasta (upsert do app).
insert into storage.objects(bucket_id,name,owner) values('avatars','d1111111-1111-4111-8111-111111111111/avatar.jpg',auth.uid());
update storage.objects set name='d1111111-1111-4111-8111-111111111111/avatar.png' where bucket_id='avatars';
do $$ begin
 if not exists (select 1 from storage.objects where name='d1111111-1111-4111-8111-111111111111/avatar.png') then raise exception 'own avatar write blocked'; end if;
end $$;

-- Não escreve, renomeia para nem apaga objeto na pasta de outra pessoa.
do $$ begin
 begin
  insert into storage.objects(bucket_id,name) values('avatars','d2222222-2222-4222-8222-222222222222/avatar.jpg');
  raise exception 'insert into another user folder unexpectedly permitted';
 exception when insufficient_privilege then null; end;
end $$;
do $$ begin
 begin
  update storage.objects set name='d2222222-2222-4222-8222-222222222222/avatar.jpg' where bucket_id='avatars';
  raise exception 'move into another user folder unexpectedly permitted';
 exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claim.sub','d2222222-2222-4222-8222-222222222222',true);
insert into storage.objects(bucket_id,name,owner) values('avatars','d2222222-2222-4222-8222-222222222222/avatar.jpg',auth.uid());
select set_config('request.jwt.claim.sub','d1111111-1111-4111-8111-111111111111',true);
delete from storage.objects where bucket_id='avatars' and name like 'd2222222%';
do $$ begin
 if (select count(*) from storage.objects where name like 'd2222222%') <> 1 then raise exception 'other user avatar deleted'; end if;
end $$;

-- Leitura pública: visitante anônimo vê as fotos.
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
 if (select count(*) from storage.objects where bucket_id='avatars') <> 2 then raise exception 'public avatar read blocked'; end if;
end $$;

-- Anônimo não escreve.
do $$ begin
 begin
  insert into storage.objects(bucket_id,name) values('avatars','d1111111-1111-4111-8111-111111111111/invasao.jpg');
  raise exception 'anonymous avatar write unexpectedly permitted';
 exception when insufficient_privilege then null; end;
end $$;

rollback;
