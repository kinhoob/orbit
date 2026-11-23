-- REVIEW ONLY. Do not apply with all historical migrations or from app startup.
-- Mensagens entre amigos (modelo confirmado pelo Marco em 22/11/2026, WhatsApp):
-- seguir é sem aceite; quando a pessoa segue de volta, os dois viram amigos e
-- amigos podem trocar mensagens. A permissão parte SEMPRE da amizade aceita
-- (orbit_private.are_friends, que já exclui bloqueados nas duas direções).
-- Não há moderação de conteúdo: as mensagens ficam entre as duas pessoas e
-- ninguém mais lê. Depende de orbit_private (20261122202000) e de follows
-- (20261123010000).
begin;

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint messages_no_self check (sender_id <> recipient_id),
  constraint messages_body_len check (char_length(body) between 1 and 2000)
);
create index messages_recipient on public.messages(recipient_id, created_at desc);
create index messages_sender on public.messages(sender_id, created_at desc);

alter table public.messages enable row level security;
revoke all on public.messages from anon, authenticated;
grant select, insert on public.messages to authenticated;

-- Ler: só quem participa da conversa, e somente enquanto não houver bloqueio
-- entre as duas pessoas (bloqueio em qualquer direção esconde o histórico,
-- como já esconde perfil, números e relações).
create policy messages_read on public.messages for select to authenticated
  using ((sender_id = auth.uid() and not orbit_private.is_blocked(auth.uid(), recipient_id))
    or (recipient_id = auth.uid() and not orbit_private.is_blocked(auth.uid(), sender_id)));

-- Enviar: como si mesmo, somente para amigo (amizade aceita, sem bloqueio).
-- Quando a amizade deixa de existir, o envio para na hora pela mesma regra.
create policy messages_send on public.messages for insert to authenticated
  with check (sender_id = auth.uid()
    and sender_id <> recipient_id
    and orbit_private.are_friends(auth.uid(), recipient_id));

-- Sem update e sem delete pela API: ninguém edita nem apaga mensagem. A
-- marcação de lida acontece só pela função abaixo, que mexe exclusivamente
-- nas mensagens recebidas por quem chama.
create function public.mark_conversation_read(other_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.messages set read_at = now()
  where recipient_id = auth.uid() and sender_id = other_user and read_at is null;
end $$;
revoke all on function public.mark_conversation_read(uuid) from public;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
commit;
