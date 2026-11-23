-- Disposable local/dev DB only. Fixtures roll back. Never run on production.
-- Conquistas com insígnias equipáveis e XP de conquista (Marco, 23/11/2026).
begin;
insert into auth.users(id) values
 ('c1111111-1111-4111-8111-111111111111'),
 ('c2222222-2222-4222-8222-222222222222');
update public.profiles set username='gabi' where id='c1111111-1111-4111-8111-111111111111';
update public.profiles set username='hugo' where id='c2222222-2222-4222-8222-222222222222';
insert into public.media_items(id,title,category) values
 ('c3333333-3333-4333-8333-333333333331','Ach 1','film'),
 ('c3333333-3333-4333-8333-333333333332','Ach 2','film'),
 ('c3333333-3333-4333-8333-333333333333','Ach 3','book'),
 ('c3333333-3333-4333-8333-333333333334','Ach 4','book'),
 ('c3333333-3333-4333-8333-333333333335','Ach 5','music');

set local role authenticated;

-- 1. Gabi avalia 1 obra: desbloqueia ratings_1 e o XP soma ledger + conquista.
select set_config('request.jwt.claim.sub','c1111111-1111-4111-8111-111111111111',true);
insert into public.ratings(user_id,media_item_id,score) values('c1111111-1111-4111-8111-111111111111','c3333333-3333-4333-8333-333333333331',8);
do $$ declare p jsonb := public.account_progress(); begin
 -- 15 do ledger (first_rating) + 10 da conquista ratings_1.
 if (p->>'base_xp')::int<>15 or (p->>'achievement_xp')::int<>10 or (p->>'total_xp')::int<>25 then
  raise exception 'Progress after first rating: %', p;
 end if;
end $$;
do $$ declare m jsonb := public.my_achievements(); begin
 if (select count(*) from jsonb_array_elements(m->'achievements'))<>(select count(*) from public.achievement_definitions) then
  raise exception 'my_achievements must list the whole catalog';
 end if;
 if not exists(select 1 from jsonb_array_elements(m->'achievements') a where a->>'id'='ratings_1' and (a->>'unlocked')::boolean and (a->>'current')::int=1) then
  raise exception 'ratings_1 should be unlocked with progress 1';
 end if;
 if exists(select 1 from jsonb_array_elements(m->'achievements') a where a->>'id'='ratings_5' and (a->>'unlocked')::boolean) then
  raise exception 'ratings_5 should still be locked';
 end if;
end $$;

-- 2. Editar, apagar e reavaliar a MESMA obra não muda contagem nem XP.
update public.ratings set score=10 where user_id='c1111111-1111-4111-8111-111111111111' and media_item_id='c3333333-3333-4333-8333-333333333331';
delete from public.ratings where user_id='c1111111-1111-4111-8111-111111111111' and media_item_id='c3333333-3333-4333-8333-333333333331';
insert into public.ratings(user_id,media_item_id,score) values('c1111111-1111-4111-8111-111111111111','c3333333-3333-4333-8333-333333333331',10);
do $$ begin
 if (public.account_progress()->>'total_xp')::int<>25 then raise exception 'Re-rating multiplied XP'; end if;
end $$;

-- 3. Equipar: desbloqueada entra; bloqueada, repetida e acima de 3 falham.
update public.profiles set equipped_badges='{ratings_1}' where id='c1111111-1111-4111-8111-111111111111';
do $$ begin
 begin
  update public.profiles set equipped_badges='{ratings_1,ratings_5}' where id='c1111111-1111-4111-8111-111111111111';
  raise exception 'Locked badge unexpectedly equipped';
 exception when insufficient_privilege then null; end;
 begin
  update public.profiles set equipped_badges='{ratings_1,ratings_1}' where id='c1111111-1111-4111-8111-111111111111';
  raise exception 'Duplicate badge unexpectedly equipped';
 exception when check_violation then null; end;
 if (select equipped_badges from public.profiles where id='c1111111-1111-4111-8111-111111111111')<>'{ratings_1}' then
  raise exception 'Failed attempts changed equipped badges';
 end if;
end $$;

-- 4. Gabi cria coleção, salva e faz amizade: novas conquistas e XP derivado.
insert into public.collections(user_id,title) values('c1111111-1111-4111-8111-111111111111','Favoritas');
insert into public.saved_items(user_id,media_item_id) values('c1111111-1111-4111-8111-111111111111','c3333333-3333-4333-8333-333333333332');
insert into public.follows(follower_id,followed_id) values('c1111111-1111-4111-8111-111111111111','c2222222-2222-4222-8222-222222222222');
select set_config('request.jwt.claim.sub','c2222222-2222-4222-8222-222222222222',true);
insert into public.follows(follower_id,followed_id) values('c2222222-2222-4222-8222-222222222222','c1111111-1111-4111-8111-111111111111');
select set_config('request.jwt.claim.sub','c1111111-1111-4111-8111-111111111111',true);
do $$ declare p jsonb := public.account_progress(); begin
 -- ledger: 15 (first_rating) + 20 (first_collection) = 35
 -- conquistas: ratings_1 (10) + collections_1 (15) + friends_1 (15) = 40
 if (p->>'base_xp')::int<>35 or (p->>'achievement_xp')::int<>40 or (p->>'total_xp')::int<>75 then
  raise exception 'Progress after collection and friendship: %', p;
 end if;
end $$;
-- Seguidor: Hugo segue Gabi, então followers_10 ainda não; mas Hugo tem friends_1.
select set_config('request.jwt.claim.sub','c2222222-2222-4222-8222-222222222222',true);
do $$ declare m jsonb := public.my_achievements(); begin
 if not exists(select 1 from jsonb_array_elements(m->'achievements') a where a->>'id'='friends_1' and (a->>'unlocked')::boolean) then
  raise exception 'Hugo should have friends_1';
 end if;
 if exists(select 1 from jsonb_array_elements(m->'achievements') a where a->>'id'='ratings_1' and (a->>'unlocked')::boolean) then
  raise exception 'Hugo rated nothing and must keep ratings_1 locked';
 end if;
end $$;

-- 5. Quatro insígnias desbloqueadas não cabem: o máximo é 3.
select set_config('request.jwt.claim.sub','c1111111-1111-4111-8111-111111111111',true);
do $$ begin
 begin
  update public.profiles set equipped_badges='{ratings_1,collections_1,friends_1,ratings_5}' where id='c1111111-1111-4111-8111-111111111111';
  raise exception 'Four badges unexpectedly equipped';
 exception when check_violation then null; end;
end $$;
update public.profiles set equipped_badges='{ratings_1,collections_1,friends_1}' where id='c1111111-1111-4111-8111-111111111111';

-- 6. Hugo não escreve no perfil de Gabi (RLS filtra a linha: zero linhas
-- alteradas, sem erro) e não chama a função interna de desbloqueio.
select set_config('request.jwt.claim.sub','c2222222-2222-4222-8222-222222222222',true);
update public.profiles set equipped_badges='{ratings_1}' where id='c1111111-1111-4111-8111-111111111111';
do $$ declare row_equipped text[]; begin
 select equipped_badges into row_equipped from public.profiles where id='c1111111-1111-4111-8111-111111111111';
 if row_equipped<>'{ratings_1,collections_1,friends_1}' then
  raise exception 'Another profile was writable: %', row_equipped;
 end if;
 begin
  perform public.unlocked_achievements('c1111111-1111-4111-8111-111111111111');
  raise exception 'Internal unlock function unexpectedly callable';
 exception when insufficient_privilege then null; end;
end $$;
-- (A leitura das insígnias equipadas de Gabi por Hugo acima já confirma que
-- a decoração escolhida aparece no perfil público.)

reset role;
rollback;
