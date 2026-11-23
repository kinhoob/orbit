-- REVIEW ONLY. Do not apply with all historical migrations or from app startup.
-- Personalização desbloqueada por nível (pedido do Marco em 23/11/2026): o XP
-- vitalício destrava novas cores de perfil, cores de botão, animações únicas
-- e insígnias de nível. A pessoa escolhe o que equipar; o visitante vê
-- apenas a escolha aplicada. O catálogo fica no banco (fonte autoritativa) e
-- o gatilho confere o nível real da conta — o cliente nunca destrava sozinho.
-- Depende de account_universe (202611190002) e profile_achievements
-- (20261123030000).
begin;

-- Catálogo de cosméticos com o nível mínimo de cada item.
create table public.cosmetic_catalog (
  kind text not null check (kind in ('theme','frame','badge','button','animation')),
  id text not null check (id ~ '^[a-zA-Z0-9_]{2,30}$'),
  name text not null check (char_length(name) between 2 and 60),
  min_level integer not null references public.level_definitions(level),
  primary key (kind, id)
);
alter table public.cosmetic_catalog enable row level security;
revoke all on public.cosmetic_catalog from anon, authenticated;
grant select on public.cosmetic_catalog to anon, authenticated;
create policy cosmetic_catalog_read on public.cosmetic_catalog for select to anon, authenticated using (true);

insert into public.cosmetic_catalog (kind, id, name, min_level) values
 ('theme','neutral','Minimalista',1),
 ('theme','sky','Céu',2),
 ('theme','softYellow','Sol suave',2),
 ('theme','forest','Mata',3),
 ('theme','blossom','Flor de cajueiro',4),
 ('theme','royal','Real',6),
 ('frame','none','Sem moldura',1),
 ('frame','line','Órbita',2),
 ('frame','double','Explorador',3),
 ('badge','none','Sem emblema',1),
 ('badge','explorer','Explorador',2),
 ('badge','collector','Colecionador',2),
 ('button','ink','Tinta',1),
 ('button','gold','Dourado',3),
 ('button','forest','Mata',4),
 ('button','wine','Vinho',5),
 ('animation','none','Sem animação',1),
 ('animation','float','Flutuar',2),
 ('animation','sway','Balanço',3),
 ('animation','pulse','Pulso',4),
 ('animation','glow','Halo',5),
 ('animation','shimmer','Brilho',6),
 ('animation','comet','Cometa',7),
 ('animation','orbit','Órbita viva',8),
 ('animation','aurora','Aurora',9);

-- Novas escolhas no perfil: cor dos botões e animação do perfil.
alter table public.profiles drop constraint profiles_profile_theme_check;
alter table public.profiles add constraint profiles_profile_theme_check
  check(profile_theme in ('neutral','sky','softYellow','forest','blossom','royal'));
alter table public.profiles add column button_theme text not null default 'ink'
  check(button_theme in ('ink','gold','forest','wine'));
alter table public.profiles add column profile_animation text not null default 'none'
  check(profile_animation in ('none','float','sway','pulse','glow','shimmer','comet','orbit','aurora'));
grant update(button_theme, profile_animation) on public.profiles to authenticated;

-- Conquistas de nível: o XP dá novas insígnias conforme o nível sobe.
alter table public.achievement_definitions drop constraint achievement_definitions_kind_check;
alter table public.achievement_definitions add constraint achievement_definitions_kind_check
  check (kind in ('ratings','collections','saved','friends','followers','likes_received','level'));

insert into public.achievement_definitions (id, title, description, icon, kind, threshold, xp_reward) values
 ('level_3','Nível Curioso','Alcançou o nível 3, Curioso.','medal','level',3,25),
 ('level_5','Nível Colecionador','Alcançou o nível 5, Colecionador.','flame','level',5,50),
 ('level_7','Nível Conhecedor','Alcançou o nível 7, Conhecedor.','trophy','level',7,80),
 ('level_10','Nível Lenda','Alcançou o nível 10, Lenda.','crown','level',10,150);

-- Nível da conta a partir do XP (ledger + bônus). As insígnias de nível
-- contam para os próximos níveis, sempre batendo com o nível exibido:
-- converge em poucas iterações porque são só 4 conquistas de nível.
create or replace function public.unlocked_achievements(profile_id uuid) returns setof text
language plpgsql stable security definer set search_path = '' as $$
declare ratings_n integer; collections_n integer; saved_n integer; friends_n integer; followers_n integer; likes_n integer;
  base_xp integer; bonus integer; level_bonus integer := 0; added integer; lvl integer;
begin
  select count(*) into ratings_n from public.ratings where user_id = profile_id;
  select count(*) into collections_n from public.collections where user_id = profile_id;
  select count(*) into saved_n from public.saved_items where user_id = profile_id;
  select count(*) into friends_n from public.friendships where status = 'accepted' and profile_id in (requester_id, addressee_id);
  select count(*) into followers_n from public.follows where followed_id = profile_id;
  select count(*) into likes_n from public.rating_likes rl join public.ratings r on r.id = rl.rating_id where r.user_id = profile_id;
  select coalesce(sum(amount), 0) into base_xp from public.xp_transactions where user_id = profile_id;
  select coalesce(sum(d.xp_reward), 0) into bonus from public.achievement_definitions d
    where d.kind <> 'level' and (
      (d.kind = 'ratings' and ratings_n >= d.threshold) or
      (d.kind = 'collections' and collections_n >= d.threshold) or
      (d.kind = 'saved' and saved_n >= d.threshold) or
      (d.kind = 'friends' and friends_n >= d.threshold) or
      (d.kind = 'followers' and followers_n >= d.threshold) or
      (d.kind = 'likes_received' and likes_n >= d.threshold));
  loop
    select coalesce(max(l.level), 1) into lvl from public.level_definitions l where l.required_xp <= base_xp + bonus + level_bonus;
    select coalesce(sum(d.xp_reward), 0) into added from public.achievement_definitions d where d.kind = 'level' and d.threshold <= lvl;
    exit when added = level_bonus;
    level_bonus := added;
  end loop;
  return query
    select d.id from public.achievement_definitions d
    where (d.kind = 'ratings' and ratings_n >= d.threshold)
       or (d.kind = 'collections' and collections_n >= d.threshold)
       or (d.kind = 'saved' and saved_n >= d.threshold)
       or (d.kind = 'friends' and friends_n >= d.threshold)
       or (d.kind = 'followers' and followers_n >= d.threshold)
       or (d.kind = 'likes_received' and likes_n >= d.threshold)
       or (d.kind = 'level' and lvl >= d.threshold);
end $$;
revoke all on function public.unlocked_achievements(uuid) from public, anon, authenticated;

-- Lista da própria conta: para conquistas de nível, "current" é o nível atual.
create or replace function public.my_achievements() returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare me uuid := auth.uid();
  ratings_n integer; collections_n integer; saved_n integer; friends_n integer; followers_n integer; likes_n integer; equipped text[];
  base_xp integer; bonus integer; level_bonus integer := 0; added integer; lvl integer;
begin
  if me is null then return null; end if;
  select count(*) into ratings_n from public.ratings where user_id = me;
  select count(*) into collections_n from public.collections where user_id = me;
  select count(*) into saved_n from public.saved_items where user_id = me;
  select count(*) into friends_n from public.friendships where status = 'accepted' and me in (requester_id, addressee_id);
  select count(*) into followers_n from public.follows where followed_id = me;
  select count(*) into likes_n from public.rating_likes rl join public.ratings r on r.id = rl.rating_id where r.user_id = me;
  select p.equipped_badges into equipped from public.profiles p where p.id = me;
  select coalesce(sum(amount), 0) into base_xp from public.xp_transactions where user_id = me;
  select coalesce(sum(d.xp_reward), 0) into bonus from public.achievement_definitions d
    where d.kind <> 'level' and (
      (d.kind = 'ratings' and ratings_n >= d.threshold) or
      (d.kind = 'collections' and collections_n >= d.threshold) or
      (d.kind = 'saved' and saved_n >= d.threshold) or
      (d.kind = 'friends' and friends_n >= d.threshold) or
      (d.kind = 'followers' and followers_n >= d.threshold) or
      (d.kind = 'likes_received' and likes_n >= d.threshold));
  loop
    select coalesce(max(l.level), 1) into lvl from public.level_definitions l where l.required_xp <= base_xp + bonus + level_bonus;
    select coalesce(sum(d.xp_reward), 0) into added from public.achievement_definitions d where d.kind = 'level' and d.threshold <= lvl;
    exit when added = level_bonus;
    level_bonus := added;
  end loop;
  return jsonb_build_object('equipped', coalesce(equipped, '{}'::text[]), 'achievements', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', d.id, 'title', d.title, 'description', d.description, 'icon', d.icon,
      'kind', d.kind, 'threshold', d.threshold, 'xp_reward', d.xp_reward,
      'current', case d.kind
        when 'ratings' then ratings_n when 'collections' then collections_n when 'saved' then saved_n
        when 'friends' then friends_n when 'followers' then followers_n when 'likes_received' then likes_n
        else lvl end,
      'unlocked', case d.kind
        when 'ratings' then ratings_n when 'collections' then collections_n when 'saved' then saved_n
        when 'friends' then friends_n when 'followers' then followers_n when 'likes_received' then likes_n
        else lvl end >= d.threshold
    ) order by d.kind, d.threshold), '[]'::jsonb)
    from public.achievement_definitions d));
end $$;
revoke all on function public.my_achievements() from public, anon;
grant execute on function public.my_achievements() to authenticated;

-- Gatilho de cosméticos guiado pelo catálogo: o nível real da conta (ledger +
-- bônus de conquistas, igual ao account_progress) precisa cobrir o nível
-- mínimo de cada item equipado.
create or replace function public.guard_profile_cosmetics() returns trigger
language plpgsql security definer set search_path = '' as $$
declare base_xp integer; bonus integer; user_level integer; required integer;
begin
  select coalesce(sum(amount), 0) into base_xp from public.xp_transactions where user_id = new.id;
  select coalesce(sum(d.xp_reward), 0) into bonus from public.achievement_definitions d
    where d.id in (select public.unlocked_achievements(new.id));
  select coalesce(max(l.level), 1) into user_level from public.level_definitions l where l.required_xp <= base_xp + bonus;
  -- id fora do catalogo cai no check da coluna (check_violation); o gatilho
  -- so confere o nivel minimo de itens conhecidos.
  select c.min_level into required from public.cosmetic_catalog c where c.kind = 'theme' and c.id = new.profile_theme;
  if required is not null and required > user_level then raise exception 'Cosmetic not unlocked' using errcode = '42501'; end if;
  select c.min_level into required from public.cosmetic_catalog c where c.kind = 'frame' and c.id = new.avatar_frame;
  if required is not null and required > user_level then raise exception 'Cosmetic not unlocked' using errcode = '42501'; end if;
  select c.min_level into required from public.cosmetic_catalog c where c.kind = 'badge' and c.id = new.profile_badge;
  if required is not null and required > user_level then raise exception 'Cosmetic not unlocked' using errcode = '42501'; end if;
  select c.min_level into required from public.cosmetic_catalog c where c.kind = 'button' and c.id = new.button_theme;
  if required is not null and required > user_level then raise exception 'Cosmetic not unlocked' using errcode = '42501'; end if;
  select c.min_level into required from public.cosmetic_catalog c where c.kind = 'animation' and c.id = new.profile_animation;
  if required is not null and required > user_level then raise exception 'Cosmetic not unlocked' using errcode = '42501'; end if;
  return new;
end $$;
revoke all on function public.guard_profile_cosmetics() from public;
drop trigger profile_cosmetics on public.profiles;
create trigger profile_cosmetics before update of profile_theme,avatar_frame,profile_badge,button_theme,profile_animation
  on public.profiles for each row execute function public.guard_profile_cosmetics();

commit;
