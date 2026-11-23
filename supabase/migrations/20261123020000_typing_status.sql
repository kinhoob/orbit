-- REVIEW ONLY. Do not apply with all historical migrations or from app startup.
-- Transporte por evento do indicador "digitando" (pedido do Marco em 23/11/2026;
-- correção de segurança na mesma rodada, 23/11/2026).
--
-- Substitui o broadcast em canal privado (migration 20261123015000, removida
-- nesta branch) pelo mesmo padrão das mensagens: uma tabela real com RLS e
-- postgres_changes. Diferença decisiva: a autorização é avaliada POR EVENTO
-- no servidor, não apenas ao entrar no tópico —
--   * escrita: cada upsert passa pelas policies INSERT/UPDATE com os dados
--     ATUAIS de amizade/bloqueio, e o sender_id é amarrado ao auth.uid();
--   * leitura: postgres_changes só entrega registros que o assinante pode ler
--     pelas policies SELECT, avaliadas registro a registro quando a mudança
--     acontece (doc Supabase, 23/11/2026: "database records are sent only to
--     clients who are allowed to read them based on your RLS policies").
-- Assim, bloqueio ou fim de amizade corta envio E recebimento já no próximo
-- evento, inclusive para conexões abertas antes da mudança — sem depender de
-- teardown no cliente.
--
-- Sem esta migration aplicada, a tabela não existe e o recurso falha fechado:
-- o upsert falha (capturado em silêncio), nada é exibido, nada vaza.

begin;

create table if not exists public.typing_status(
  pair_key text not null,
  sender_id uuid not null references auth.users(id) on delete cascade,
  is_typing boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (pair_key, sender_id),
  -- pair_key = "<uuid menor>:<uuid maior>" (os dois lados calculam o mesmo).
  constraint typing_status_pair_key_shape check (
    pair_key ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and split_part(pair_key, ':', 1) < split_part(pair_key, ':', 2)
  )
);

alter table public.typing_status enable row level security;

grant select, insert, update on public.typing_status to authenticated;

-- Leitura: só um dos dois do par, com amizade aceita e sem bloqueio
-- (orbit_private.are_friends exclui bloqueados nos dois sentidos).
drop policy if exists typing_status_select on public.typing_status;
create policy typing_status_select on public.typing_status for select to authenticated
using (
  auth.uid()::text in (split_part(pair_key, ':', 1), split_part(pair_key, ':', 2))
  and orbit_private.are_friends(
    split_part(pair_key, ':', 1)::uuid,
    split_part(pair_key, ':', 2)::uuid
  )
);

-- Escrita: o remetente é o próprio auth.uid() (sem falar em nome do outro),
-- é um dos dois do par e a amizade está ativa. Avaliado em CADA upsert.
drop policy if exists typing_status_insert on public.typing_status;
create policy typing_status_insert on public.typing_status for insert to authenticated
with check (
  sender_id = auth.uid()
  and auth.uid()::text in (split_part(pair_key, ':', 1), split_part(pair_key, ':', 2))
  and orbit_private.are_friends(
    split_part(pair_key, ':', 1)::uuid,
    split_part(pair_key, ':', 2)::uuid
  )
);

drop policy if exists typing_status_update on public.typing_status;
create policy typing_status_update on public.typing_status for update to authenticated
using (
  sender_id = auth.uid()
  and auth.uid()::text in (split_part(pair_key, ':', 1), split_part(pair_key, ':', 2))
  and orbit_private.are_friends(
    split_part(pair_key, ':', 1)::uuid,
    split_part(pair_key, ':', 2)::uuid
  )
)
with check (
  sender_id = auth.uid()
  and auth.uid()::text in (split_part(pair_key, ':', 1), split_part(pair_key, ':', 2))
  and orbit_private.are_friends(
    split_part(pair_key, ':', 1)::uuid,
    split_part(pair_key, ':', 2)::uuid
  )
);

-- Publicação realtime (mesmo padrão da migration de messages); guarda para o
-- banco local de testes, onde a publicação da plataforma não existe.
do $guard$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.typing_status;
  end if;
end
$guard$;

commit;
