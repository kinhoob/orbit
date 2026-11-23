-- REVIEW ONLY. Do not apply with all historical migrations or from app startup.
-- Números do perfil (pedido do Marco em 22/11/2026): avaliações, amigos e
-- curtidas recebidas, mostrados como nos perfis do TikTok/Instagram — sem
-- criar seguidores: amizades continuam bidirecionais e privadas em lista;
-- aqui sai só o total. Depende de orbit_private (20261122202000) e de
-- rating_likes (202611180002).
begin;

create or replace function public.profile_stats(profile_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare viewer uuid := auth.uid(); ratings_count integer; friends_count integer; likes_count integer;
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

 return jsonb_build_object('ratings', ratings_count, 'friends', friends_count, 'likes', likes_count);
end $$;

revoke all on function public.profile_stats(uuid) from public;
grant execute on function public.profile_stats(uuid) to anon, authenticated;
commit;
