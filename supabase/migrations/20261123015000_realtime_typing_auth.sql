-- REVIEW ONLY. Do not apply with all historical migrations or from app startup.
-- Autorização do indicador "digitando" (pedido do Marco em 23/11/2026).
--
-- O canal de broadcast vira PRIVADO no cliente e estas policies em
-- realtime.messages (Realtime Authorization) limitam envio E recebimento do
-- evento "typing" aos dois participantes do tópico, com amizade aceita e sem
-- bloqueio — a mesma regra das mensagens — e amarram o userId do payload a
-- auth.uid(), para ninguém falar em nome do outro.
--
-- Semântica confirmada na documentação atual do Supabase (23/11/2026): a
-- autorização é calculada quando a conexão WebSocket entra no tópico e fica
-- cacheada naquela conexão — NÃO é reavaliada a cada evento. Ou seja: após
-- bloqueio ou fim de amizade, o corte no servidor vale para NOVAS conexões;
-- a interrupção imediata vem do cliente, que remove o canal e para de emitir
-- assim que a relação deixa de permitir conversa. Como os eventos expiram em
-- 4s e nenhum cliente íntegro emite após o bloqueio, o canal morto não
-- entrega nada — risco residual documentado no PR.
--
-- Sem esta migration aplicada, o canal privado nega tudo (fail-closed): o
-- indicador não aparece, nada vaza e nenhum evento é forjado por terceiros
-- com a anon key.
--
-- Produção: apenas DROP/CREATE POLICY rodam — a plataforma trava o schema
-- realtime (criar tabela/função ou ALTER TABLE nele falha e abortaria a
-- transação, pulando as policies). O stub abaixo existe SÓ para o banco
-- local de testes (PGlite), quando as peças da plataforma não existem.

begin;

create schema if not exists realtime;
do $guard$
begin
  if not exists (select 1 from pg_tables where schemaname = 'realtime' and tablename = 'messages') then
    -- Stub LOCAL apenas: em produção este ramo nunca executa.
    create table realtime.messages(
      id bigserial primary key,
      topic text not null,
      extension text not null,
      event text,
      payload jsonb,
      inserted_at timestamptz not null default now()
    );
    grant usage on schema realtime to authenticated;
    grant select, insert on realtime.messages to authenticated;
    grant usage on sequence realtime.messages_id_seq to authenticated;
    alter table realtime.messages enable row level security;
  end if;
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'realtime' and p.proname = 'topic') then
    execute $fn$create function realtime.topic() returns text
      language sql stable as $body$select current_setting('realtime.topic', true)$body$$fn$;
  end if;
end
$guard$;

-- O tópico é typing:<uuid>:<uuid> com os ids ORDENADOS (o cliente calcula o
-- mesmo nome dos dois lados); a documentação mostra realtime.topic() sem o
-- prefixo "realtime:", então ele é opcional na expressão. Vale apenas para
-- broadcast "typing": auth.uid() precisa ser um dos dois ids do tópico, os
-- dois precisam ser amigos (orbit_private.are_friends exclui bloqueados nos
-- dois sentidos) e, no envio, o userId do payload precisa ser o próprio
-- auth.uid() — sem falar em nome do outro.
drop policy if exists typing_broadcast_select on realtime.messages;
create policy typing_broadcast_select on realtime.messages for select to authenticated
using (
  extension = 'broadcast'
  and realtime.topic() ~ '^(realtime:)?typing:[0-9a-fA-F-]{36}:[0-9a-fA-F-]{36}$'
  and auth.uid()::text in (
    substring(realtime.topic() from 'typing:([0-9a-fA-F-]{36}):'),
    substring(realtime.topic() from 'typing:[0-9a-fA-F-]{36}:([0-9a-fA-F-]{36})$')
  )
  and orbit_private.are_friends(
    substring(realtime.topic() from 'typing:([0-9a-fA-F-]{36}):')::uuid,
    substring(realtime.topic() from 'typing:[0-9a-fA-F-]{36}:([0-9a-fA-F-]{36})$')::uuid
  )
);

drop policy if exists typing_broadcast_insert on realtime.messages;
create policy typing_broadcast_insert on realtime.messages for insert to authenticated
with check (
  extension = 'broadcast'
  and event = 'typing'
  and realtime.topic() ~ '^(realtime:)?typing:[0-9a-fA-F-]{36}:[0-9a-fA-F-]{36}$'
  and auth.uid()::text in (
    substring(realtime.topic() from 'typing:([0-9a-fA-F-]{36}):'),
    substring(realtime.topic() from 'typing:[0-9a-fA-F-]{36}:([0-9a-fA-F-]{36})$')
  )
  and orbit_private.are_friends(
    substring(realtime.topic() from 'typing:([0-9a-fA-F-]{36}):')::uuid,
    substring(realtime.topic() from 'typing:[0-9a-fA-F-]{36}:([0-9a-fA-F-]{36})$')::uuid
  )
  and (payload->>'userId')::uuid = auth.uid()
);

commit;
