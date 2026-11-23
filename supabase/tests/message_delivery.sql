-- Disposable local/dev DB only. Fixtures roll back. Never run on production.
-- Estados reais: enviada, entregue (só com confirmação do outro aparelho) e
-- lida (só com leitura efetiva). Marco, 22/11/2026.
begin;
insert into auth.users(id) values
 ('b1111111-1111-4111-8111-111111111111'),
 ('b2222222-2222-4222-8222-222222222222'),
 ('b3333333-3333-4333-8333-333333333333');
update public.profiles set username='lia' where id='b1111111-1111-4111-8111-111111111111';
update public.profiles set username='noa' where id='b2222222-2222-4222-8222-222222222222';
update public.profiles set username='ivo' where id='b3333333-3333-4333-8333-333333333333';
insert into public.friendships(requester_id, addressee_id, status) values
 ('b1111111-1111-4111-8111-111111111111','b2222222-2222-4222-8222-222222222222','accepted');

set local role authenticated;
select set_config('request.jwt.claim.sub','b1111111-1111-4111-8111-111111111111',true);

-- 1. Enviada: logo após o INSERT, sem entrega nem leitura.
insert into public.messages(sender_id, recipient_id, body) values
 ('b1111111-1111-4111-8111-111111111111','b2222222-2222-4222-8222-222222222222','chegou aí?');
do $$ declare r record; begin
 select delivered_at, read_at into r from public.messages limit 1;
 if r.delivered_at is not null or r.read_at is not null then
   raise exception 'Message should start only as sent';
 end if;
end $$;

-- 2. Entregue: só quando o cliente da destinataria confirma o recebimento.
select set_config('request.jwt.claim.sub','b2222222-2222-4222-8222-222222222222',true);
select public.mark_conversation_delivered('b1111111-1111-4111-8111-111111111111');
do $$ declare r record; begin
 select delivered_at, read_at into r from public.messages limit 1;
 if r.delivered_at is null or r.read_at is not null then
   raise exception 'Delivered state wrong: %', r;
 end if;
end $$;

-- 3. O remetente não confirma entrega das próprias mensagens.
select set_config('request.jwt.claim.sub','b1111111-1111-4111-8111-111111111111',true);
insert into public.messages(sender_id, recipient_id, body) values
 ('b1111111-1111-4111-8111-111111111111','b2222222-2222-4222-8222-222222222222','e essa?');
select public.mark_conversation_delivered('b2222222-2222-4222-8222-222222222222');
do $$ declare r record; begin
 select delivered_at into r from public.messages where body='e essa?';
 if r.delivered_at is not null then
   raise exception 'Sender marked own message delivered';
 end if;
end $$;

-- 4. Lida implica entregue: a leitura completa a entrega junto.
select set_config('request.jwt.claim.sub','b2222222-2222-4222-8222-222222222222',true);
select public.mark_conversation_read('b1111111-1111-4111-8111-111111111111');
do $$ declare r record; begin
 select delivered_at, read_at into r from public.messages where body='e essa?';
 if r.delivered_at is null or r.read_at is null then
   raise exception 'Read should complete delivery: %', r;
 end if;
end $$;

-- 5. Terceiro não confirma entrega nem leitura da conversa alheia.
select set_config('request.jwt.claim.sub','b1111111-1111-4111-8111-111111111111',true);
insert into public.messages(sender_id, recipient_id, body) values
 ('b1111111-1111-4111-8111-111111111111','b2222222-2222-4222-8222-222222222222','terceira');
select set_config('request.jwt.claim.sub','b3333333-3333-4333-8333-333333333333',true);
select public.mark_conversation_delivered('b1111111-1111-4111-8111-111111111111');
select public.mark_conversation_read('b1111111-1111-4111-8111-111111111111');
reset role;
do $$ declare r record; begin
 select delivered_at, read_at into r from public.messages where body='terceira';
 if r.delivered_at is not null or r.read_at is not null then
   raise exception 'Third party changed delivery state';
 end if;
end $$;

-- 6. Entrega depois de lida não apaga a leitura nem regredir o estado.
update public.messages set delivered_at=now(), read_at=now() where body='terceira';
set local role authenticated;
select set_config('request.jwt.claim.sub','b2222222-2222-4222-8222-222222222222',true);
select public.mark_conversation_delivered('b1111111-1111-4111-8111-111111111111');
do $$ declare r record; begin
 select read_at into r from public.messages where body='terceira';
 if r.read_at is null then
   raise exception 'Delivery regressed read state';
 end if;
end $$;

-- 7. Anônimo não chama as funções.
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
 perform public.mark_conversation_delivered('b1111111-1111-4111-8111-111111111111');
 raise exception 'Anon called mark_conversation_delivered';
exception when insufficient_privilege then
 -- esperado: sem grant para anon
end $$;
rollback;
