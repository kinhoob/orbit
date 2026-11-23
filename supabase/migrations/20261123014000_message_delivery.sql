-- REVIEW ONLY. Do not apply with all historical migrations or from app startup.
-- Estados reais da mensagem (pedido do Marco em 22/11/2026, WhatsApp):
-- enviada (o INSERT confirmou), entregue (o aparelho da destinataria recebeu
-- de fato, por busca ou evento em tempo real) e lida (ela abriu a conversa).
-- Nada aqui inventa estado: entregue exige a confirmação do outro aparelho,
-- pela função abaixo; lida continua vindo só da leitura efetiva.
-- Depende de messages (20261123012000).
begin;

alter table public.messages add column delivered_at timestamptz;

-- O cliente da destinataria chama ao receber mensagens desta pessoa. Mesma
-- regra da leitura: mexe só nas mensagens recebidas por quem chama e não faz
-- nada quando há bloqueio entre os dois (quem não pode ler também não confirma
-- recebimento). Segue a ordem natural: entrega nunca apaga leitura.
create function public.mark_conversation_delivered(other_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if orbit_private.is_blocked(auth.uid(), other_user) then
    return;
  end if;
  update public.messages set delivered_at = now()
  where recipient_id = auth.uid() and sender_id = other_user and delivered_at is null;
end $$;
revoke all on function public.mark_conversation_delivered(uuid) from public;
grant execute on function public.mark_conversation_delivered(uuid) to authenticated;

-- Ler implica ter recebido: a marcação de lida completa a entrega junto.
create or replace function public.mark_conversation_read(other_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if orbit_private.is_blocked(auth.uid(), other_user) then
    return;
  end if;
  update public.messages set delivered_at = coalesce(delivered_at, now()), read_at = now()
  where recipient_id = auth.uid() and sender_id = other_user and read_at is null;
end $$;

-- Tempo real: INSERT e UPDATE de mensagens chegam aos participantes pelo canal
-- do Supabase, sem polling. A publicação só existe no projeto hospedado; em
-- bancos locais de teste o bloco não faz nada.
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
commit;
