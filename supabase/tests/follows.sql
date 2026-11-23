-- Disposable local/dev DB only. Fixtures roll back. Never run on production.
-- Seguir unilateral sem aceite e amizade por reciprocidade (Marco, 22/11/2026).
begin;
insert into auth.users(id) values
 ('e1111111-1111-4111-8111-111111111111'),
 ('e2222222-2222-4222-8222-222222222222'),
 ('e3333333-3333-4333-8333-333333333333'),
 ('e4444444-4444-4444-8444-444444444444'),
 ('e5555555-5555-4555-8555-555555555555'),
 ('e6666666-6666-4666-8666-666666666666');
-- Os perfis nascem pelo gatilho de auth.users; aqui só os usernames.
update public.profiles set username='ana' where id='e1111111-1111-4111-8111-111111111111';
update public.profiles set username='bia' where id='e2222222-2222-4222-8222-222222222222';
update public.profiles set username='caio' where id='e3333333-3333-4333-8333-333333333333';
update public.profiles set username='duda' where id='e4444444-4444-4444-8444-444444444444';
update public.profiles set username='erik' where id='e5555555-5555-4555-8555-555555555555';
update public.profiles set username='fabi' where id='e6666666-6666-4666-8666-666666666666';

set local role authenticated;

-- 1. Ana segue Bia sem aceite: a relação já vale na hora.
select set_config('request.jwt.claim.sub','e1111111-1111-4111-8111-111111111111',true);
insert into public.follows(follower_id, followed_id) values
 ('e1111111-1111-4111-8111-111111111111','e2222222-2222-4222-8222-222222222222');
do $$ declare s jsonb := public.profile_stats('e2222222-2222-4222-8222-222222222222'); begin
 if (s->>'followers')::int<>1 or (s->>'following')::int<>0 or (s->>'friends')::int<>0 then
  raise exception 'Bia stats after one-way follow: %', s;
 end if;
end $$;

-- 2. Bia segue de volta: os dois viram amigos automaticamente.
select set_config('request.jwt.claim.sub','e2222222-2222-4222-8222-222222222222',true);
insert into public.follows(follower_id, followed_id) values
 ('e2222222-2222-4222-8222-222222222222','e1111111-1111-4111-8111-111111111111');
do $$ begin
 if not orbit_private.are_friends('e1111111-1111-4111-8111-111111111111','e2222222-2222-4222-8222-222222222222') then
  raise exception 'Mutual follow did not create accepted friendship';
 end if;
end $$;
do $$ declare s jsonb := public.profile_stats('e2222222-2222-4222-8222-222222222222'); begin
 if (s->>'friends')::int<>1 or (s->>'followers')::int<>1 or (s->>'following')::int<>1 then
  raise exception 'Bia stats after mutual follow: %', s;
 end if;
end $$;

-- 3. Deixar de seguir não desfaz a amizade.
delete from public.follows where follower_id='e2222222-2222-4222-8222-222222222222' and followed_id='e1111111-1111-4111-8111-111111111111';
do $$ begin
 if not orbit_private.are_friends('e1111111-1111-4111-8111-111111111111','e2222222-2222-4222-8222-222222222222') then
  raise exception 'Unfollow removed the friendship';
 end if;
end $$;

-- 4. Não pode seguir a si mesmo.
do $$ begin
 insert into public.follows(follower_id, followed_id) values
  ('e2222222-2222-4222-8222-222222222222','e2222222-2222-4222-8222-222222222222');
 raise exception 'Self follow was allowed';
exception when others then
 if sqlerrm = 'Self follow was allowed' then raise; end if;
end $$;

-- 5. Não pode seguir em nome de outra pessoa (claim é Bia, follower seria Ana).
do $$ begin
 insert into public.follows(follower_id, followed_id) values
  ('e1111111-1111-4111-8111-111111111111','e3333333-3333-4333-8333-333333333333');
 raise exception 'Follow as someone else was allowed';
exception when others then
 if sqlerrm = 'Follow as someone else was allowed' then raise; end if;
end $$;

-- 6. Bia não consegue apagar o seguir que Ana mantém nela.
delete from public.follows where follower_id='e1111111-1111-4111-8111-111111111111' and followed_id='e2222222-2222-4222-8222-222222222222';
do $$ begin
 if not exists (select 1 from public.follows where follower_id='e1111111-1111-4111-8111-111111111111' and followed_id='e2222222-2222-4222-8222-222222222222') then
  raise exception 'Someone elses follow was deleted';
 end if;
end $$;

-- 7. Duda segue Bia: Caio vê 2 seguidores (Ana e Duda) no perfil dela.
select set_config('request.jwt.claim.sub','e4444444-4444-4444-8444-444444444444',true);
insert into public.follows(follower_id, followed_id) values
 ('e4444444-4444-4444-8444-444444444444','e2222222-2222-4222-8222-222222222222');
select set_config('request.jwt.claim.sub','e3333333-3333-4333-8333-333333333333',true);
do $$ declare s jsonb := public.profile_stats('e2222222-2222-4222-8222-222222222222'); begin
 if (s->>'followers')::int<>2 then
  raise exception 'Bia followers before block: %', s;
 end if;
end $$;

-- 8. Caio bloqueia Duda: o seguir dela some da contagem para ele, e nenhum
-- dos dois consegue seguir o outro em nenhuma direção.
insert into public.blocks(blocker_id, blocked_id) values
 ('e3333333-3333-4333-8333-333333333333','e4444444-4444-4444-8444-444444444444');
do $$ declare s jsonb := public.profile_stats('e2222222-2222-4222-8222-222222222222'); begin
 if (s->>'followers')::int<>1 then
  raise exception 'Bia followers after block: %', s;
 end if;
end $$;
do $$ begin
 insert into public.follows(follower_id, followed_id) values
  ('e3333333-3333-4333-8333-333333333333','e4444444-4444-4444-8444-444444444444');
 raise exception 'Blocker could follow blocked';
exception when others then
 if sqlerrm = 'Blocker could follow blocked' then raise; end if;
end $$;
select set_config('request.jwt.claim.sub','e4444444-4444-4444-8444-444444444444',true);
do $$ begin
 insert into public.follows(follower_id, followed_id) values
  ('e4444444-4444-4444-8444-444444444444','e3333333-3333-4333-8333-333333333333');
 raise exception 'Blocked could follow blocker';
exception when others then
 if sqlerrm = 'Blocked could follow blocker' then raise; end if;
end $$;

-- 9. Pedido de amizade pendente vira aceito quando o seguir fica mútuo.
select set_config('request.jwt.claim.sub','e5555555-5555-4555-8555-555555555555',true);
insert into public.friendships(requester_id, addressee_id, status) values
 ('e5555555-5555-4555-8555-555555555555','e6666666-6666-4666-8666-666666666666','pending');
insert into public.follows(follower_id, followed_id) values
 ('e5555555-5555-4555-8555-555555555555','e6666666-6666-4666-8666-666666666666');
do $$ begin
 if orbit_private.are_friends('e5555555-5555-4555-8555-555555555555','e6666666-6666-4666-8666-666666666666') then
  raise exception 'One-way follow accepted the pending request';
 end if;
end $$;
select set_config('request.jwt.claim.sub','e6666666-6666-4666-8666-666666666666',true);
insert into public.follows(follower_id, followed_id) values
 ('e6666666-6666-4666-8666-666666666666','e5555555-5555-4555-8555-555555555555');
do $$ begin
 if not orbit_private.are_friends('e5555555-5555-4555-8555-555555555555','e6666666-6666-4666-8666-666666666666') then
  raise exception 'Pending request not accepted on mutual follow';
 end if;
end $$;

-- 10. Anônimo não lê relações de seguir.
reset role;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ declare n integer; begin
 select count(*) into n from public.follows;
 raise exception 'Anonymous could read follows (% rows)', n;
exception when insufficient_privilege then null;
end $$;

reset role;
rollback;
