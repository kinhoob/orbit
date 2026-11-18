begin;
-- Curtidas em avaliacoes (timelines do Explorar). Uma curtida por pessoa por
-- avaliacao; remover a curtida e delete da propria linha. Sem seguidores:
-- a timeline de amigos usa as amizades bidirecionais ja existentes.
create table public.rating_likes (
  rating_id uuid not null references public.ratings(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (rating_id, user_id)
);
create index rating_likes_user on public.rating_likes(user_id);

alter table public.rating_likes enable row level security;
revoke all on public.rating_likes from anon, authenticated;
grant select, insert, delete on public.rating_likes to authenticated;

-- Ver curtidas apenas de avaliacoes que voce ja pode ver (mesma regra de
-- visibilidade das avaliacoes: publica, de amigo, ou propria; nunca de bloqueado).
-- Alem disso, a identidade do curtidor respeita bloqueios: curtidas de quem te
-- bloqueou ou foi bloqueado por voce nao aparecem, mesmo em avaliacao publica.
create policy rating_likes_read on public.rating_likes for select to authenticated
  using (not public.is_blocked(auth.uid(), user_id)
    and exists (
    select 1 from public.ratings r
    where r.id = rating_id
      and (r.user_id = auth.uid()
        or (not public.is_blocked(auth.uid(), r.user_id)
          and (r.visibility = 'public'
            or (r.visibility = 'friends' and public.are_friends(auth.uid(), r.user_id)))))));

-- Curtir somente avaliacao visivel de outra pessoa, como si mesmo.
create policy rating_likes_add on public.rating_likes for insert to authenticated
  with check (user_id = auth.uid() and exists (
    select 1 from public.ratings r
    where r.id = rating_id
      and r.user_id <> auth.uid()
      and not public.is_blocked(auth.uid(), r.user_id)
      and (r.visibility = 'public'
        or (r.visibility = 'friends' and public.are_friends(auth.uid(), r.user_id)))));

-- Descurtir apenas a propria curtida.
create policy rating_likes_remove on public.rating_likes for delete to authenticated
  using (user_id = auth.uid());
commit;
