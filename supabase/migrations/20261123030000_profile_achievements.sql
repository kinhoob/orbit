-- REVIEW ONLY. Do not apply with all historical migrations or from app startup.
-- Conquistas com insígnias equipáveis e XP de conquista (pedido do Marco em
-- 23/11/2026): o catálogo deriva apenas de contagens agregadas reais
-- (avaliações, coleções, salvos, amizades, seguidores, curtidas recebidas) —
-- nunca de títulos, gêneros ou visibilidade de obras, então nada privado
-- aparece no perfil público. Editar ou reavaliar a mesma obra não muda a
-- contagem de obras distintas, e o XP de conquista é derivado (não um evento
-- repetível), então não há ganho duplicado.
-- Depende de account_universe (202611190002) e follows (20261123010000).
begin;

create table public.achievement_definitions (
  id text primary key check (id ~ '^[a-z0-9_]{3,40}$'),
  title text not null check (char_length(title) between 3 and 80),
  description text not null check (char_length(description) between 3 and 200),
  icon text not null check (char_length(icon) between 2 and 40),
  kind text not null check (kind in ('ratings','collections','saved','friends','followers','likes_received')),
  threshold integer not null check (threshold >= 1),
  xp_reward integer not null check (xp_reward between 0 and 1000),
  unique (kind, threshold)
);
alter table public.achievement_definitions enable row level security;
revoke all on public.achievement_definitions from anon, authenticated;
grant select on public.achievement_definitions to anon, authenticated;
create policy achievement_definitions_read on public.achievement_definitions for select to anon, authenticated using (true);

insert into public.achievement_definitions (id, title, description, icon, kind, threshold, xp_reward) values
 ('ratings_1','Primeira nota','Avaliou a primeira obra.','star','ratings',1,10),
 ('ratings_5','Cinco descobertas','Avaliou 5 obras.','sparkles','ratings',5,15),
 ('ratings_10','Crítico de carteirinha','Avaliou 10 obras.','medal','ratings',10,25),
 ('ratings_25','Maratonista cultural','Avaliou 25 obras.','flame','ratings',25,40),
 ('ratings_50','Curador veterano','Avaliou 50 obras.','trophy','ratings',50,70),
 ('ratings_100','Centena','Avaliou 100 obras.','crown','ratings',100,120),
 ('collections_1','Primeira coleção','Criou a primeira coleção.','library','collections',1,15),
 ('collections_5','Curador de coleções','Criou 5 coleções.','gem','collections',5,50),
 ('saved_10','Biblioteca viva','Salvou 10 obras para depois.','bookmark','saved',10,20),
 ('friends_1','Primeira amizade','Formou a primeira amizade.','users','friends',1,15),
 ('friends_5','Círculo fechado','Formou 5 amizades.','orbit','friends',5,30),
 ('followers_10','Voz na órbita','Alcançou 10 seguidores.','megaphone','followers',10,30),
 ('likes_10','Aplausos','Recebeu 10 curtidas nas avaliações.','heart','likes_received',10,25);

-- Conquistas desbloqueadas de uma conta, derivadas de contagens reais. Uso
-- interno (gatilho e funções da própria conta); não é concedida ao cliente.
create function public.unlocked_achievements(profile_id uuid) returns setof text
language plpgsql stable security definer set search_path = '' as $$
declare ratings_n integer; collections_n integer; saved_n integer; friends_n integer; followers_n integer; likes_n integer;
begin
  select count(*) into ratings_n from public.ratings where user_id = profile_id;
  select count(*) into collections_n from public.collections where user_id = profile_id;
  select count(*) into saved_n from public.saved_items where user_id = profile_id;
  select count(*) into friends_n from public.friendships where status = 'accepted' and profile_id in (requester_id, addressee_id);
  select count(*) into followers_n from public.follows where followed_id = profile_id;
  select count(*) into likes_n from public.rating_likes rl join public.ratings r on r.id = rl.rating_id where r.user_id = profile_id;
  return query
    select d.id from public.achievement_definitions d
    where (d.kind = 'ratings' and ratings_n >= d.threshold)
       or (d.kind = 'collections' and collections_n >= d.threshold)
       or (d.kind = 'saved' and saved_n >= d.threshold)
       or (d.kind = 'friends' and friends_n >= d.threshold)
       or (d.kind = 'followers' and followers_n >= d.threshold)
       or (d.kind = 'likes_received' and likes_n >= d.threshold);
end $$;
revoke all on function public.unlocked_achievements(uuid) from public, anon, authenticated;

-- Lista da própria conta para a tela de Conquistas: catálogo completo com
-- progresso atual, estado de desbloqueio e insígnias equipadas.
create function public.my_achievements() returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare me uuid := auth.uid();
  ratings_n integer; collections_n integer; saved_n integer; friends_n integer; followers_n integer; likes_n integer; equipped text[];
begin
  if me is null then return null; end if;
  select count(*) into ratings_n from public.ratings where user_id = me;
  select count(*) into collections_n from public.collections where user_id = me;
  select count(*) into saved_n from public.saved_items where user_id = me;
  select count(*) into friends_n from public.friendships where status = 'accepted' and me in (requester_id, addressee_id);
  select count(*) into followers_n from public.follows where followed_id = me;
  select count(*) into likes_n from public.rating_likes rl join public.ratings r on r.id = rl.rating_id where r.user_id = me;
  select p.equipped_badges into equipped from public.profiles p where p.id = me;
  return jsonb_build_object('equipped', coalesce(equipped, '{}'::text[]), 'achievements', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', d.id, 'title', d.title, 'description', d.description, 'icon', d.icon,
      'kind', d.kind, 'threshold', d.threshold, 'xp_reward', d.xp_reward,
      'current', case d.kind
        when 'ratings' then ratings_n when 'collections' then collections_n when 'saved' then saved_n
        when 'friends' then friends_n when 'followers' then followers_n else likes_n end,
      'unlocked', case d.kind
        when 'ratings' then ratings_n when 'collections' then collections_n when 'saved' then saved_n
        when 'friends' then friends_n when 'followers' then followers_n else likes_n end >= d.threshold
    ) order by d.kind, d.threshold), '[]'::jsonb)
    from public.achievement_definitions d));
end $$;
revoke all on function public.my_achievements() from public, anon;
grant execute on function public.my_achievements() to authenticated;

-- Insígnias equipadas: no máximo 3, sem repetição, e somente conquistas já
-- desbloqueadas pela própria conta. A escolha é opcional e reversível.
alter table public.profiles add column equipped_badges text[] not null default '{}';
grant update(equipped_badges) on public.profiles to authenticated;

create function public.guard_equipped_badges() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(array_length(new.equipped_badges, 1), 0) > 3 then
    raise exception 'Too many equipped badges' using errcode = '23514';
  end if;
  if (select count(*) from unnest(new.equipped_badges) b) <> (select count(distinct b) from unnest(new.equipped_badges) b) then
    raise exception 'Duplicate equipped badge' using errcode = '23514';
  end if;
  if exists (select 1 from unnest(new.equipped_badges) b where b not in (select public.unlocked_achievements(new.id))) then
    raise exception 'Badge not unlocked' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function public.guard_equipped_badges() from public;
create trigger profile_equipped_badges before update of equipped_badges on public.profiles for each row execute function public.guard_equipped_badges();

-- XP vitalício agora inclui o bônus das conquistas desbloqueadas, derivado das
-- mesmas contagens: editar/reavaliar a mesma obra não multiplica recompensa.
-- Definer porque consulta a função interna de desbloqueio; só lê linhas da
-- própria conta (auth.uid()) e devolve o resumo dela, nada de outras pessoas.
create or replace function public.account_progress() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare me uuid := auth.uid(); ledger record; bonus integer;
begin
  if me is null then return null; end if;
  select coalesce(sum(amount), 0) as xp, count(*) filter (where reason = 'first_rating') as reviews,
         bool_or(reason = 'first_collection') as collection
    into ledger from public.xp_transactions where user_id = me;
  select coalesce(sum(d.xp_reward), 0) into bonus
    from public.achievement_definitions d where d.id in (select public.unlocked_achievements(me));
  return (
    with current_level as (
      select l.* from public.level_definitions l where l.required_xp <= ledger.xp + bonus order by required_xp desc limit 1
    )
    select jsonb_build_object(
      'total_xp', ledger.xp + bonus, 'base_xp', ledger.xp, 'achievement_xp', bonus,
      'level', l.level, 'title', l.title, 'floor_xp', l.required_xp,
      'next_xp', (select min(required_xp) from public.level_definitions where required_xp > ledger.xp + bonus),
      'rated_works', ledger.reviews, 'first_collection', coalesce(ledger.collection, false))
    from current_level l);
end $$;
revoke all on function public.account_progress() from public, anon;
grant execute on function public.account_progress() to authenticated;

commit;
