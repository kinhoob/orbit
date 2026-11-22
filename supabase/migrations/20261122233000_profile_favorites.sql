-- REVIEW ONLY. Do not apply with all historical migrations or from app startup.
-- Favoritos do perfil: obras que a própria pessoa escolhe destacar no perfil.
-- Vitrine pública (como as avaliações públicas): qualquer visitante lê, bloqueio
-- esconde, só a pessoa dona marca e desmarca. Depende de orbit_private (20261122202000).
begin;
create table public.profile_favorites (
 user_id uuid not null references public.profiles(id) on delete cascade,
 media_item_id uuid not null references public.media_items(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key (user_id, media_item_id)
);
create index profile_favorites_recent on public.profile_favorites(user_id, created_at desc);

alter table public.profile_favorites enable row level security;

revoke all on public.profile_favorites from anon, authenticated;
grant select on public.profile_favorites to anon, authenticated;
grant insert, delete on public.profile_favorites to authenticated;

create policy profile_favorites_read on public.profile_favorites for select
 using (not orbit_private.is_blocked(auth.uid(), user_id));
create policy profile_favorites_add on public.profile_favorites for insert to authenticated
 with check (user_id = auth.uid());
create policy profile_favorites_remove on public.profile_favorites for delete to authenticated
 using (user_id = auth.uid());
commit;
