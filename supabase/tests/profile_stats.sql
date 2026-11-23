-- Disposable local/dev DB only. Fixtures roll back. Never run on production.
-- Números do perfil: visibilidade por papel, bloqueios e curtidas recebidas.
begin;
insert into auth.users(id) values
 ('d1111111-1111-4111-8111-111111111111'),
 ('d2222222-2222-4222-8222-222222222222'),
 ('d3333333-3333-4333-8333-333333333333'),
 ('d4444444-4444-4444-8444-444444444444'),
 ('d5555555-5555-4555-8555-555555555555');
-- Os perfis nascem pelo gatilho de auth.users; aqui só os usernames.
update public.profiles set username='dona' where id='d1111111-1111-4111-8111-111111111111';
update public.profiles set username='amiga' where id='d2222222-2222-4222-8222-222222222222';
update public.profiles set username='estranha' where id='d3333333-3333-4333-8333-333333333333';
update public.profiles set username='curtidora' where id='d4444444-4444-4444-8444-444444444444';
update public.profiles set username='bloqueada' where id='d5555555-5555-4555-8555-555555555555';
insert into public.media_items(id,title,category) values
 ('d6666666-6666-4666-8666-666666666661','Obra um','film'),
 ('d6666666-6666-4666-8666-666666666662','Obra dois','film'),
 ('d6666666-6666-4666-8666-666666666663','Obra tres','film');
insert into public.ratings(id,user_id,media_item_id,score,visibility) values
 ('d7777777-7777-4777-8777-777777777771','d1111111-1111-4111-8111-111111111111','d6666666-6666-4666-8666-666666666661',8,'public'),
 ('d7777777-7777-4777-8777-777777777772','d1111111-1111-4111-8111-111111111111','d6666666-6666-4666-8666-666666666662',7,'friends'),
 ('d7777777-7777-4777-8777-777777777773','d1111111-1111-4111-8111-111111111111','d6666666-6666-4666-8666-666666666663',9,'private');
insert into public.friendships(requester_id,addressee_id,status) values
 ('d1111111-1111-4111-8111-111111111111','d2222222-2222-4222-8222-222222222222','accepted'),
 ('d1111111-1111-4111-8111-111111111111','d3333333-3333-4333-8333-333333333333','pending'),
 ('d3333333-3333-4333-8333-333333333333','d4444444-4444-4444-8444-444444444444','accepted');
insert into public.rating_likes(rating_id,user_id) values
 ('d7777777-7777-4777-8777-777777777771','d2222222-2222-4222-8222-222222222222'),
 ('d7777777-7777-4777-8777-777777777771','d3333333-3333-4333-8333-333333333333'),
 ('d7777777-7777-4777-8777-777777777771','d4444444-4444-4444-8444-444444444444'),
 ('d7777777-7777-4777-8777-777777777772','d2222222-2222-4222-8222-222222222222'),
 ('d7777777-7777-4777-8777-777777777772','d4444444-4444-4444-8444-444444444444'),
 ('d7777777-7777-4777-8777-777777777773','d2222222-2222-4222-8222-222222222222');
-- A estranha bloqueia a curtidora: a curtida dela some só para a estranha.
insert into public.blocks(blocker_id,blocked_id) values
 ('d3333333-3333-4333-8333-333333333333','d4444444-4444-4444-8444-444444444444');
-- A dona bloqueia a quinta pessoa: o perfil some por completo para ela.
insert into public.blocks(blocker_id,blocked_id) values
 ('d1111111-1111-4111-8111-111111111111','d5555555-5555-4555-8555-555555555555');

set local role authenticated;

-- A própria dona vê tudo: 3 avaliações, 1 amizade aceita, 6 curtidas.
select set_config('request.jwt.claim.sub','d1111111-1111-4111-8111-111111111111',true);
do $$ declare s jsonb := public.profile_stats('d1111111-1111-4111-8111-111111111111'); begin
 if s is null or (s->>'ratings')::int<>3 or (s->>'friends')::int<>1 or (s->>'likes')::int<>6 then
  raise exception 'Own stats wrong: %', s;
 end if;
end $$;

-- A amiga vê avaliações públicas e de amigos (2), e as curtidas nelas (3+2=5).
select set_config('request.jwt.claim.sub','d2222222-2222-4222-8222-222222222222',true);
do $$ declare s jsonb := public.profile_stats('d1111111-1111-4111-8111-111111111111'); begin
 if s is null or (s->>'ratings')::int<>2 or (s->>'friends')::int<>1 or (s->>'likes')::int<>5 then
  raise exception 'Friend stats wrong: %', s;
 end if;
end $$;

-- A estranha vê só a avaliação pública; a curtida de quem ela bloqueou não conta (3-1=2).
-- Amizade pendente não vira conteúdo de amigo nem entra no total de amigos.
select set_config('request.jwt.claim.sub','d3333333-3333-4333-8333-333333333333',true);
do $$ declare s jsonb := public.profile_stats('d1111111-1111-4111-8111-111111111111'); begin
 if s is null or (s->>'ratings')::int<>1 or (s->>'friends')::int<>1 or (s->>'likes')::int<>2 then
  raise exception 'Stranger stats wrong: %', s;
 end if;
end $$;

-- A curtidora, bloqueada pela estranha, não vê a curtida da estranha (3-1=2).
select set_config('request.jwt.claim.sub','d4444444-4444-4444-8444-444444444444',true);
do $$ declare s jsonb := public.profile_stats('d1111111-1111-4111-8111-111111111111'); begin
 if s is null or (s->>'ratings')::int<>1 or (s->>'friends')::int<>1 or (s->>'likes')::int<>2 then
  raise exception 'Liker stats wrong: %', s;
 end if;
end $$;

-- Visitante anônimo vê só o público, sem filtro de bloqueio de curtidor.
reset role;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ declare s jsonb := public.profile_stats('d1111111-1111-4111-8111-111111111111'); begin
 if s is null or (s->>'ratings')::int<>1 or (s->>'friends')::int<>1 or (s->>'likes')::int<>3 then
  raise exception 'Anonymous stats wrong: %', s;
 end if;
end $$;

-- Bloqueio com a dona esconde o perfil inteiro: sem números.
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','d5555555-5555-4555-8555-555555555555',true);
do $$ begin
 if public.profile_stats('d1111111-1111-4111-8111-111111111111') is not null then
  raise exception 'Blocked viewer still sees stats';
 end if;
end $$;
reset role;
rollback;
