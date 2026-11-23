-- Disposable local/dev DB only. Fixtures roll back. Never run on production.
-- Transporte por evento do "digitando": escrita checa permissão e identidade
-- em CADA upsert; leitura (postgres_changes) é filtrada registro a registro
-- pelas policies SELECT. Os casos de revogação trocam os dados de relação no
-- MEIO da mesma sessão autenticada (set local role mantido): provam que uma
-- conexão pré-existente perde envio e recebimento no próximo evento, sem
-- depender de novo join nem de teardown no cliente.
begin;
insert into auth.users(id) values
 ('a1111111-1111-4111-8111-111111111111'),
 ('b2222222-2222-4222-8222-222222222222'),
 ('c3333333-3333-4333-8333-333333333333');

-- A e B são amigos; C é terceiro sem vínculo.
insert into public.friendships(requester_id, addressee_id, status) values
 ('a1111111-1111-4111-8111-111111111111','b2222222-2222-4222-8222-222222222222','accepted');

set local role authenticated;

-- 1. Amigo A liga "digitando" no par A:B: permitido.
select set_config('request.jwt.claim.sub','a1111111-1111-4111-8111-111111111111',true);
insert into public.typing_status(pair_key, sender_id, is_typing) values
 ('a1111111-1111-4111-8111-111111111111:b2222222-2222-4222-8222-222222222222',
  'a1111111-1111-4111-8111-111111111111', true);

-- 2. A não pode falar em nome de B: sender_id alheio é negado.
do $$ begin
 insert into public.typing_status(pair_key, sender_id, is_typing) values
  ('a1111111-1111-4111-8111-111111111111:b2222222-2222-4222-8222-222222222222',
   'b2222222-2222-4222-8222-222222222222', true);
 raise exception 'Forged sender was allowed';
exception when others then
 if sqlerrm = 'Forged sender was allowed' then raise; end if;
end $$;

-- 3. Terceiro C não escreve no par alheio.
select set_config('request.jwt.claim.sub','c3333333-3333-4333-8333-333333333333',true);
do $$ begin
 insert into public.typing_status(pair_key, sender_id, is_typing) values
  ('a1111111-1111-4111-8111-111111111111:b2222222-2222-4222-8222-222222222222',
   'c3333333-3333-4333-8333-333333333333', true);
 raise exception 'Stranger write was allowed';
exception when others then
 if sqlerrm = 'Stranger write was allowed' then raise; end if;
end $$;

-- 4. Terceiro C não lê nada do par alheio (postgres_changes filtra igual).
do $$ declare n integer; begin
 select count(*) into n from public.typing_status;
 if n<>0 then raise exception 'Stranger could read typing rows: %', n; end if;
end $$;

-- 5. A não escreve no par com C: é do par, mas sem amizade.
select set_config('request.jwt.claim.sub','a1111111-1111-4111-8111-111111111111',true);
do $$ begin
 insert into public.typing_status(pair_key, sender_id, is_typing) values
  ('a1111111-1111-4111-8111-111111111111:c3333333-3333-4333-8333-333333333333',
   'a1111111-1111-4111-8111-111111111111', true);
 raise exception 'Non-friend write was allowed';
exception when others then
 if sqlerrm = 'Non-friend write was allowed' then raise; end if;
end $$;

-- 6. REVOGAÇÃO NA MESMA SESSÃO: desfeita a amizade, o PRÓXIMO upsert de A já
-- é negado — sem novo join, sem troca de role (a "conexão" continua aberta).
reset role;
delete from public.friendships;
set local role authenticated;
select set_config('request.jwt.claim.sub','a1111111-1111-4111-8111-111111111111',true);
do $$ begin
 insert into public.typing_status(pair_key, sender_id, is_typing) values
  ('a1111111-1111-4111-8111-111111111111:b2222222-2222-4222-8222-222222222222',
   'a1111111-1111-4111-8111-111111111111', true)
 on conflict (pair_key, sender_id) do update set is_typing = true, updated_at = now();
 raise exception 'Write after unfriend was allowed';
exception when others then
 if sqlerrm = 'Write after unfriend was allowed' then raise; end if;
end $$;

-- 7. REVOGAÇÃO DE LEITURA NA MESMA SESSÃO: B, que lia a linha de A, deixa de
-- vê-la no próximo evento — a policy SELECT é reavaliada por registro.
select set_config('request.jwt.claim.sub','b2222222-2222-4222-8222-222222222222',true);
do $$ declare n integer; begin
 select count(*) into n from public.typing_status;
 if n<>0 then raise exception 'Ex-friend still reads typing rows: %', n; end if;
end $$;

-- 8. Amizade refeita com bloqueio de B em A: escrita de A negada e leitura
-- de B vazia, mesmo com a linha antiga presente.
reset role;
insert into public.friendships(requester_id, addressee_id, status) values
 ('a1111111-1111-4111-8111-111111111111','b2222222-2222-4222-8222-222222222222','accepted');
insert into public.blocks(blocker_id, blocked_id) values
 ('b2222222-2222-4222-8222-222222222222','a1111111-1111-4111-8111-111111111111');
set local role authenticated;
select set_config('request.jwt.claim.sub','a1111111-1111-4111-8111-111111111111',true);
do $$ begin
 insert into public.typing_status(pair_key, sender_id, is_typing) values
  ('a1111111-1111-4111-8111-111111111111:b2222222-2222-4222-8222-222222222222',
   'a1111111-1111-4111-8111-111111111111', true)
 on conflict (pair_key, sender_id) do update set is_typing = true, updated_at = now();
 raise exception 'Write while blocked was allowed';
exception when others then
 if sqlerrm = 'Write while blocked was allowed' then raise; end if;
end $$;
select set_config('request.jwt.claim.sub','b2222222-2222-4222-8222-222222222222',true);
do $$ declare n integer; begin
 select count(*) into n from public.typing_status;
 if n<>0 then raise exception 'Blocker still reads typing rows: %', n; end if;
end $$;

-- 9. Sem bloqueio, A desliga o indicador (is_typing=false): permitido.
reset role;
delete from public.blocks;
set local role authenticated;
select set_config('request.jwt.claim.sub','a1111111-1111-4111-8111-111111111111',true);
insert into public.typing_status(pair_key, sender_id, is_typing) values
 ('a1111111-1111-4111-8111-111111111111:b2222222-2222-4222-8222-222222222222',
  'a1111111-1111-4111-8111-111111111111', false)
on conflict (pair_key, sender_id) do update set is_typing = false, updated_at = now();

-- 10. pair_key fora de ordem é rejeitado pelo CHECK (simetria obrigatória).
do $$ begin
 insert into public.typing_status(pair_key, sender_id, is_typing) values
  ('b2222222-2222-4222-8222-222222222222:a1111111-1111-4111-8111-111111111111',
   'a1111111-1111-4111-8111-111111111111', true);
 raise exception 'Unsorted pair_key was allowed';
exception when others then
 if sqlerrm = 'Unsorted pair_key was allowed' then raise; end if;
end $$;

-- 11. B lê a linha final de A (amizade vale de novo): leitura de amigo ok.
select set_config('request.jwt.claim.sub','b2222222-2222-4222-8222-222222222222',true);
do $$ declare n integer; begin
 select count(*) into n from public.typing_status;
 if n<>1 then raise exception 'Friend could not read typing rows: %', n; end if;
end $$;

rollback;
