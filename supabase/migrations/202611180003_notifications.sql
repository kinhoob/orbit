begin;
-- Notificacoes do Sino (arquitetura aprovada pelo Marco em 18/11/2026).
-- Somente eventos reais: pedido de amizade recebido, amizade aceita e curtida
-- na sua avaliacao. As linhas sao criadas por gatilhos (security definer);
-- ninguem insere direto. Sem seguidores: amizades bidirecionais, e bloqueio
-- esconde qualquer notificacao de quem bloqueou ou foi bloqueado.
--
-- EM REVISAO: como as outras migrations do PR, aplicar somente apos revisao
-- e validacao em projeto Supabase de desenvolvimento.
--
-- Invariante de visibilidade (revisao de seguranca 18/11/2026): a linha de
-- notificacao revela apenas ator + tipo + data. No caso rating_like, o
-- destinatario e sempre o DONO da avaliacao referenciada, que por definicao
-- enxerga a propria avaliacao e suas curtidas; ou seja, a notificacao nao
-- expoe conteudo que o destinatario ja nao veja. Bloqueio vale na leitura
-- (policy SELECT usa is_blocked, simetrico), entao bloquear depois esconde
-- ate notificacoes antigas. Se a avaliacao, a amizade ou o perfil do ator
-- forem apagados, as FKs on delete cascade removem a notificacao junto.
-- Descurtir NAO apaga a notificacao historica (decisao de design: o indice
-- unico evita empilhamento; o evento aconteceu e o registro e historico).

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('friend_request','friend_accepted','rating_like')),
  friendship_id uuid references public.friendships(id) on delete cascade,
  rating_id uuid references public.ratings(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (recipient_id <> actor_id)
);
create index notifications_recipient on public.notifications(recipient_id, created_at desc);
-- Uma notificacao de curtida por pessoa por avaliacao (curtir, descurtir e
-- curtir de novo nao empilha avisos).
create unique index notifications_like_once on public.notifications(actor_id, rating_id) where type = 'rating_like';

alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant select, update(read_at) on public.notifications to authenticated;

-- Voce le so as suas; nada de quem voce bloqueou ou te bloqueou.
create policy notifications_read on public.notifications for select to authenticated
  using (recipient_id = auth.uid() and not public.is_blocked(auth.uid(), actor_id));
-- Voce so marca as suas como lidas (e so o read_at e editavel, pelo grant).
create policy notifications_mark_read on public.notifications for update to authenticated
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

-- Pedido de amizade recebido: avisa o destinatario.
create function public.notify_friend_request() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'pending' then
    insert into public.notifications (recipient_id, actor_id, type, friendship_id)
    values (new.addressee_id, new.requester_id, 'friend_request', new.id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;
revoke all on function public.notify_friend_request() from public;
create trigger friendship_requested after insert on public.friendships
  for each row execute function public.notify_friend_request();

-- Pedido aceito: avisa quem enviou.
create function public.notify_friend_accepted() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.status = 'pending' and new.status = 'accepted' then
    insert into public.notifications (recipient_id, actor_id, type, friendship_id)
    values (new.requester_id, new.addressee_id, 'friend_accepted', new.id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;
revoke all on function public.notify_friend_accepted() from public;
create trigger friendship_accepted after update of status on public.friendships
  for each row execute function public.notify_friend_accepted();

-- Curtida na sua avaliacao: avisa o autor da avaliacao.
create function public.notify_rating_like() returns trigger language plpgsql security definer set search_path = '' as $$
declare
  owner uuid;
begin
  select user_id into owner from public.ratings where id = new.rating_id;
  if owner is not null and owner <> new.user_id then
    insert into public.notifications (recipient_id, actor_id, type, rating_id)
    values (owner, new.user_id, 'rating_like', new.rating_id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;
revoke all on function public.notify_rating_like() from public;
create trigger rating_liked after insert on public.rating_likes
  for each row execute function public.notify_rating_like();
commit;
