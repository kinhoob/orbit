-- REVIEW ONLY. Do not apply with all historical migrations or from app startup.
-- Autorização do indicador "digitando" (pedido do Marco em 23/11/2026).
--
-- O canal de broadcast vira PRIVADO no cliente e estas policies em
-- realtime.messages (Realtime Authorization) limitam envio E recebimento aos
-- dois participantes da conversa, exigindo amizade aceita sem bloqueio —
-- a mesma regra das mensagens. Desfeita a amizade ou feito bloqueio, o
-- servidor passa a negar na hora. Sem esta migration aplicada, o canal
-- privado nega tudo (fail-closed): o indicador não aparece, nada vaza e
-- nenhum evento é forjado por terceiros com a anon key.

begin;

-- Ambientes locais de teste (PGlite) não têm o schema do Realtime da
-- plataforma. O stub abaixo SÓ é criado quando as peças não existem; em
-- produção schema, tabela e função da plataforma permanecem intocados.
create schema if not exists realtime;
do $guard$
begin
  if not exists (select 1 from pg_tables where schemaname = 'realtime' and tablename = 'messages') then
    create table realtime.messages(
      id bigserial primary key,
      topic text not null,
      extension text not null,
      event text,
      payload jsonb,
      inserted_at timestamptz not null default now()
    );
    grant usage on sequence realtime.messages_id_seq to authenticated;
  end if;
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'realtime' and p.proname = 'topic') then
    execute $fn$create function realtime.topic() returns text
      language sql stable as $body$select current_setting('realtime.topic', true)$body$$fn$;
  end if;
end
$guard$;

alter table realtime.messages enable row level security;
grant usage on schema realtime to authenticated;
grant select, insert on realtime.messages to authenticated;

-- O tópico é realtime:typing:<uuid>:<uuid> com os ids ORDENADOS (o cliente
-- calcula o mesmo nome dos dois lados). Vale para broadcast "typing" apenas:
-- auth.uid() precisa ser um dos dois ids do tópico E os dois precisam ser
-- amigos (orbit_private.are_friends já exclui bloqueados nos dois sentidos).
drop policy if exists typing_broadcast_select on realtime.messages;
create policy typing_broadcast_select on realtime.messages for select to authenticated
using (
  extension = 'broadcast'
  and event = 'typing'
  and realtime.topic() ~ '^realtime:typing:[0-9a-fA-F-]{36}:[0-9a-fA-F-]{36}$'
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
  and realtime.topic() ~ '^realtime:typing:[0-9a-fA-F-]{36}:[0-9a-fA-F-]{36}$'
  and auth.uid()::text in (
    substring(realtime.topic() from 'typing:([0-9a-fA-F-]{36}):'),
    substring(realtime.topic() from 'typing:[0-9a-fA-F-]{36}:([0-9a-fA-F-]{36})$')
  )
  and orbit_private.are_friends(
    substring(realtime.topic() from 'typing:([0-9a-fA-F-]{36}):')::uuid,
    substring(realtime.topic() from 'typing:[0-9a-fA-F-]{36}:([0-9a-fA-F-]{36})$')::uuid
  )
);

commit;
