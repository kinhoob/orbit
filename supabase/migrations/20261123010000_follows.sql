-- REVIEW ONLY. Do not apply with all historical migrations or from app startup.
-- Seguir unilateral, sem aceite (decisão do Marco em 22/11/2026, WhatsApp).
-- Reciprocidade confirmada pelo Marco na mesma conversa: quando a outra
-- pessoa segue de volta, os dois viram amigos (e, quando existir conversa
-- no app, poderão trocar mensagens — o chat em si ainda não existe). A
-- amizade criada assim é a mesma friendships aceita de sempre; deixar de
-- seguir depois NÃO desfaz a amizade. Depende de orbit_private (20261122202000).
begin;

create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followed_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  constraint follows_no_self check (follower_id <> followed_id)
);
create index follows_followed on public.follows(followed_id);

alter table public.follows enable row level security;
revoke all on public.follows from anon, authenticated;
grant select, insert, delete on public.follows to authenticated;

-- Ver relações de seguir somente sem bloqueio entre quem vê e qualquer uma
-- das duas pontas (mesma ideia da leitura de rating_likes).
create policy follows_read on public.follows for select to authenticated
  using (not orbit_private.is_blocked(auth.uid(), follower_id)
    and not orbit_private.is_blocked(auth.uid(), followed_id));

-- Seguir sem aceite: como si mesmo, outra pessoa, sem bloqueio em nenhuma
-- direção. Quem te bloqueou não pode ser seguido por você nem te seguir.
create policy follows_add on public.follows for insert to authenticated
  with check (follower_id = auth.uid()
    and follower_id <> followed_id
    and not orbit_private.is_blocked(auth.uid(), followed_id));

-- Deixar de seguir apenas a própria relação.
create policy follows_remove on public.follows for delete to authenticated
  using (follower_id = auth.uid());

-- Reciprocidade: seguir mútuo vira amizade aceita automaticamente. Se já
-- existia um pedido pendente em qualquer direção, ele é aceito na hora.
-- Blocos impedem o seguir antes, então o gatilho nunca cria amizade entre
-- pessoas bloqueadas. Security definer: escreve em friendships sem depender
-- das políticas de pedido/aceite manual.
create function public.follows_mutual_friendship() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.follows f where f.follower_id = new.followed_id and f.followed_id = new.follower_id) then
    insert into public.friendships (requester_id, addressee_id, status)
    values (new.follower_id, new.followed_id, 'accepted')
    on conflict do nothing;
    update public.friendships set status = 'accepted'
    where status <> 'accepted'
      and ((requester_id = new.follower_id and addressee_id = new.followed_id)
        or (requester_id = new.followed_id and addressee_id = new.follower_id));
  end if;
  return new;
end $$;
revoke all on function public.follows_mutual_friendship() from public;

create trigger follows_mutual_friendship after insert on public.follows
  for each row execute function public.follows_mutual_friendship();

-- Os números do perfil passam a incluir Seguidores e Seguindo, ao lado de
-- Avaliações, Amigos e Curtidas. Mesmas regras de visibilidade e bloqueio:
-- relações com quem tem bloqueio com quem vê não entram na contagem.
create or replace function public.profile_stats(profile_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare viewer uuid := auth.uid(); ratings_count integer; friends_count integer; likes_count integer; followers_count integer; following_count integer;
begin
 -- Bloqueio em qualquer direção esconde os números, como já esconde o perfil.
 if viewer is not null and orbit_private.is_blocked(viewer, profile_id) then
  return null;
 end if;

 -- Só conta avaliações que a pessoa que vê já poderia ler (mesma regra do
 -- RLS de ratings): próprias, públicas, ou de amigo quando há amizade aceita.
 select count(*) into ratings_count from public.ratings r
 where r.user_id = profile_id
  and (r.user_id = viewer or r.visibility = 'public'
   or (r.visibility = 'friends' and viewer is not null and orbit_private.are_friends(viewer, profile_id)));

 -- Total de amizades aceitas. Só o número, nunca a lista.
 select count(*) into friends_count from public.friendships f
 where f.status = 'accepted' and profile_id in (f.requester_id, f.addressee_id);

 -- Curtidas recebidas nas avaliações visíveis para quem vê. Curtidas de
 -- pessoas com bloqueio entre ela e quem vê não contam, espelhando a
 -- política de leitura de rating_likes.
 select count(*) into likes_count
 from public.rating_likes rl join public.ratings r on r.id = rl.rating_id
 where r.user_id = profile_id
  and (r.user_id = viewer or r.visibility = 'public'
   or (r.visibility = 'friends' and viewer is not null and orbit_private.are_friends(viewer, profile_id)))
  and (viewer is null or not orbit_private.is_blocked(viewer, rl.user_id));

 -- Seguidores: relações de quem segue este perfil, sem bloqueio com quem vê.
 select count(*) into followers_count from public.follows f
 where f.followed_id = profile_id
  and (viewer is null or not orbit_private.is_blocked(viewer, f.follower_id));

 -- Seguindo: relações que este perfil mantém, sem bloqueio com quem vê.
 select count(*) into following_count from public.follows f
 where f.follower_id = profile_id
  and (viewer is null or not orbit_private.is_blocked(viewer, f.followed_id));

 return jsonb_build_object('ratings', ratings_count, 'friends', friends_count, 'likes', likes_count, 'followers', followers_count, 'following', following_count);
end $$;

revoke all on function public.profile_stats(uuid) from public;
grant execute on function public.profile_stats(uuid) to anon, authenticated;
commit;
