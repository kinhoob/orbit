-- Disposable local/dev DB only. Fixtures roll back. Never run on production.
-- Autorização do broadcast "digitando": só os dois amigos da conversa emitem
-- e recebem; terceiros, não-amigos e bloqueados são negados pelo servidor; e
-- o userId do payload precisa ser o próprio remetente (auth.uid()).
begin;
insert into auth.users(id) values
 ('a1111111-1111-4111-8111-111111111111'),
 ('b2222222-2222-4222-8222-222222222222'),
 ('c3333333-3333-4333-8333-333333333333');

-- A e B são amigos; C é terceiro sem vínculo.
insert into public.friendships(requester_id, addressee_id, status) values
 ('a1111111-1111-4111-8111-111111111111','b2222222-2222-4222-8222-222222222222','accepted');

set local role authenticated;

-- 1. Amigo A envia "typing" no canal da conversa com B: permitido.
select set_config('request.jwt.claim.sub','a1111111-1111-4111-8111-111111111111',true);
select set_config('realtime.topic','realtime:typing:a1111111-1111-4111-8111-111111111111:b2222222-2222-4222-8222-222222222222',true);
insert into realtime.messages(topic, extension, event, payload) values
 ('realtime:typing:a1111111-1111-4111-8111-111111111111:b2222222-2222-4222-8222-222222222222','broadcast','typing','{"typing":true,"userId":"a1111111-1111-4111-8111-111111111111"}');

-- 2. Terceiro C não envia no canal alheio (não é participante).
select set_config('request.jwt.claim.sub','c3333333-3333-4333-8333-333333333333',true);
do $$ begin
 insert into realtime.messages(topic, extension, event, payload) values
  ('realtime:typing:a1111111-1111-4111-8111-111111111111:b2222222-2222-4222-8222-222222222222','broadcast','typing','{"typing":true,"userId":"c3333333-3333-4333-8333-333333333333"}');
 raise exception 'Stranger send was allowed';
exception when others then
 if sqlerrm = 'Stranger send was allowed' then raise; end if;
end $$;

-- 3. Terceiro C não recebe o canal alheio (select não enxerga a linha).
do $$ declare n integer; begin
 select count(*) into n from realtime.messages;
 if n<>0 then raise exception 'Stranger could read typing channel: %', n; end if;
end $$;

-- 4. A não envia no canal com C: participante, mas sem amizade.
select set_config('request.jwt.claim.sub','a1111111-1111-4111-8111-111111111111',true);
select set_config('realtime.topic','realtime:typing:a1111111-1111-4111-8111-111111111111:c3333333-3333-4333-8333-333333333333',true);
do $$ begin
 insert into realtime.messages(topic, extension, event, payload) values
  ('realtime:typing:a1111111-1111-4111-8111-111111111111:c3333333-3333-4333-8333-333333333333','broadcast','typing','{"typing":true,"userId":"a1111111-1111-4111-8111-111111111111"}');
 raise exception 'Non-friend send was allowed';
exception when others then
 if sqlerrm = 'Non-friend send was allowed' then raise; end if;
end $$;

-- 5. Desfeita a amizade, o envio entre A e B passa a ser negado.
reset role;
delete from public.friendships;
set local role authenticated;
select set_config('request.jwt.claim.sub','a1111111-1111-4111-8111-111111111111',true);
select set_config('realtime.topic','realtime:typing:a1111111-1111-4111-8111-111111111111:b2222222-2222-4222-8222-222222222222',true);
do $$ begin
 insert into realtime.messages(topic, extension, event, payload) values
  ('realtime:typing:a1111111-1111-4111-8111-111111111111:b2222222-2222-4222-8222-222222222222','broadcast','typing','{"typing":true,"userId":"a1111111-1111-4111-8111-111111111111"}');
 raise exception 'Send after unfriend was allowed';
exception when others then
 if sqlerrm = 'Send after unfriend was allowed' then raise; end if;
end $$;

-- 6. Amizade refeita, mas com bloqueio: também negado.
reset role;
insert into public.friendships(requester_id, addressee_id, status) values
 ('a1111111-1111-4111-8111-111111111111','b2222222-2222-4222-8222-222222222222','accepted');
insert into public.blocks(blocker_id, blocked_id) values
 ('b2222222-2222-4222-8222-222222222222','a1111111-1111-4111-8111-111111111111');
set local role authenticated;
select set_config('request.jwt.claim.sub','a1111111-1111-4111-8111-111111111111',true);
do $$ begin
 insert into realtime.messages(topic, extension, event, payload) values
  ('realtime:typing:a1111111-1111-4111-8111-111111111111:b2222222-2222-4222-8222-222222222222','broadcast','typing','{"typing":true,"userId":"a1111111-1111-4111-8111-111111111111"}');
 raise exception 'Send while blocked was allowed';
exception when others then
 if sqlerrm = 'Send while blocked was allowed' then raise; end if;
end $$;

-- 7. Evento diferente de "typing" no mesmo tópico não entra pela policy.
reset role;
delete from public.blocks;
set local role authenticated;
select set_config('request.jwt.claim.sub','a1111111-1111-4111-8111-111111111111',true);
do $$ begin
 insert into realtime.messages(topic, extension, event, payload) values
  ('realtime:typing:a1111111-1111-4111-8111-111111111111:b2222222-2222-4222-8222-222222222222','broadcast','location','{"userId":"a1111111-1111-4111-8111-111111111111","lat":1}');
 raise exception 'Non-typing event was allowed';
exception when others then
 if sqlerrm = 'Non-typing event was allowed' then raise; end if;
end $$;

-- 8. B continua recebendo o canal da conversa depois de tudo isso.
select set_config('request.jwt.claim.sub','b2222222-2222-4222-8222-222222222222',true);
do $$ declare n integer; begin
 select count(*) into n from realtime.messages;
 if n<>1 then raise exception 'Friend could not read typing channel: %', n; end if;
end $$;

-- 9. A não pode falar em nome de B: payload com userId de outra pessoa é negado.
select set_config('request.jwt.claim.sub','a1111111-1111-4111-8111-111111111111',true);
do $$ begin
 insert into realtime.messages(topic, extension, event, payload) values
  ('realtime:typing:a1111111-1111-4111-8111-111111111111:b2222222-2222-4222-8222-222222222222','broadcast','typing','{"typing":true,"userId":"b2222222-2222-4222-8222-222222222222"}');
 raise exception 'Forged userId was allowed';
exception when others then
 if sqlerrm = 'Forged userId was allowed' then raise; end if;
end $$;

-- 10. Tópico sem o prefixo "realtime:" (forma documentada) também autoriza amigos.
select set_config('realtime.topic','typing:a1111111-1111-4111-8111-111111111111:b2222222-2222-4222-8222-222222222222',true);
do $$ declare n integer; begin
 select count(*) into n from realtime.messages;
 if n<>1 then raise exception 'Friend could not read unprefixed typing topic: %', n; end if;
end $$;

rollback;
