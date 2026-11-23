-- Disposable local/dev DB only. Fixtures roll back. Never run on production.
-- Mensagens só entre amigos (modelo confirmado pelo Marco em 22/11/2026).
begin;
insert into auth.users(id) values
 ('a1111111-1111-4111-8111-111111111111'),
 ('a2222222-2222-4222-8222-222222222222'),
 ('a3333333-3333-4333-8333-333333333333');
update public.profiles set username='lia' where id='a1111111-1111-4111-8111-111111111111';
update public.profiles set username='noa' where id='a2222222-2222-4222-8222-222222222222';
update public.profiles set username='ivo' where id='a3333333-3333-4333-8333-333333333333';

-- Lia e Noa são amigas; Ivo não é amigo de ninguém.
insert into public.friendships(requester_id, addressee_id, status) values
 ('a1111111-1111-4111-8111-111111111111','a2222222-2222-4222-8222-222222222222','accepted');

set local role authenticated;

-- 1. Amiga envia mensagem e as duas participantes leem.
select set_config('request.jwt.claim.sub','a1111111-1111-4111-8111-111111111111',true);
insert into public.messages(sender_id, recipient_id, body) values
 ('a1111111-1111-4111-8111-111111111111','a2222222-2222-4222-8222-222222222222','oi, viu o novo episódio?');
do $$ declare n integer; begin
 select count(*) into n from public.messages;
 if n<>1 then raise exception 'Sender could not read own message: %', n; end if;
end $$;
select set_config('request.jwt.claim.sub','a2222222-2222-4222-8222-222222222222',true);
do $$ declare n integer; begin
 select count(*) into n from public.messages;
 if n<>1 then raise exception 'Recipient could not read the message: %', n; end if;
end $$;

-- 2. Amizade vale nas duas direções: Noa responde.
insert into public.messages(sender_id, recipient_id, body) values
 ('a2222222-2222-4222-8222-222222222222','a1111111-1111-4111-8111-111111111111','vi sim, muito bom');

-- 3. Quem não é amigo não envia (RLS) nem lê nada.
select set_config('request.jwt.claim.sub','a3333333-3333-4333-8333-333333333333',true);
do $$ begin
 insert into public.messages(sender_id, recipient_id, body) values
  ('a3333333-3333-4333-8333-333333333333','a1111111-1111-4111-8111-111111111111','sou estranho');
 raise exception 'Non-friend message was allowed';
exception when insufficient_privilege then null;
end $$;
do $$ declare n integer; begin
 select count(*) into n from public.messages;
 if n<>0 then raise exception 'Stranger could read messages: %', n; end if;
end $$;

-- 4. Ninguém envia como outra pessoa nem para si mesmo.
do $$ begin
 insert into public.messages(sender_id, recipient_id, body) values
  ('a1111111-1111-4111-8111-111111111111','a2222222-2222-4222-8222-222222222222','fingindo ser a Lia');
 raise exception 'Message as someone else was allowed';
exception when insufficient_privilege then null;
end $$;
do $$ begin
 insert into public.messages(sender_id, recipient_id, body) values
  ('a3333333-3333-4333-8333-333333333333','a3333333-3333-4333-8333-333333333333','para mim mesmo');
 raise exception 'Self message was allowed';
exception when others then
 if sqlerrm = 'Self message was allowed' then raise; end if;
end $$;

-- 5. Texto vazio ou longo demais é recusado pelo banco.
select set_config('request.jwt.claim.sub','a1111111-1111-4111-8111-111111111111',true);
do $$ begin
 insert into public.messages(sender_id, recipient_id, body) values
  ('a1111111-1111-4111-8111-111111111111','a2222222-2222-4222-8222-222222222222','');
 raise exception 'Empty message was allowed';
exception when check_violation then null;
end $$;
do $$ begin
 insert into public.messages(sender_id, recipient_id, body) values
  ('a1111111-1111-4111-8111-111111111111','a2222222-2222-4222-8222-222222222222',repeat('x',2001));
 raise exception 'Oversized message was allowed';
exception when check_violation then null;
end $$;

-- 6. Mensagem não é editável nem apagável pela API (sem grant).
do $$ begin
 update public.messages set body='alterado' where sender_id='a1111111-1111-4111-8111-111111111111';
 raise exception 'Message update was allowed';
exception when insufficient_privilege then null;
end $$;
do $$ begin
 delete from public.messages where sender_id='a1111111-1111-4111-8111-111111111111';
 raise exception 'Message delete was allowed';
exception when insufficient_privilege then null;
end $$;

-- 7. Marcar como lida: só a destinatária, só o que recebeu.
-- Estou como Lia e marco a conversa com Noa: só a mensagem recebida de Noa
-- marca; a que EU enviei continua não lida até Noa marcar.
select public.mark_conversation_read('a2222222-2222-4222-8222-222222222222');
do $$ declare n integer; begin
 select count(*) into n from public.messages where read_at is not null;
 if n<>1 then raise exception 'mark_conversation_read touched wrong rows: %', n; end if;
end $$;
select set_config('request.jwt.claim.sub','a2222222-2222-4222-8222-222222222222',true);
select public.mark_conversation_read('a1111111-1111-4111-8111-111111111111');
do $$ declare n integer; begin
 select count(*) into n from public.messages where read_at is not null;
 if n<>2 then raise exception 'Recipient mark_conversation_read failed: %', n; end if;
end $$;

-- 8. Quando a amizade acaba, o envio para; o histórico continua legível
-- para as duas participantes.
delete from public.friendships
 where requester_id='a1111111-1111-4111-8111-111111111111' and addressee_id='a2222222-2222-4222-8222-222222222222';
do $$ begin
 insert into public.messages(sender_id, recipient_id, body) values
  ('a2222222-2222-4222-8222-222222222222','a1111111-1111-4111-8111-111111111111','ainda consigo?');
 raise exception 'Message after friendship ended was allowed';
exception when insufficient_privilege then null;
end $$;
do $$ declare n integer; begin
 select count(*) into n from public.messages;
 if n<>2 then raise exception 'History hidden after friendship ended: %', n; end if;
end $$;

-- 9. Bloqueio em qualquer direção esconde o histórico e barra o envio,
-- mesmo com amizade ativa.
reset role;
insert into public.friendships(requester_id, addressee_id, status) values
 ('a1111111-1111-4111-8111-111111111111','a2222222-2222-4222-8222-222222222222','accepted');
insert into public.blocks(blocker_id, blocked_id) values
 ('a1111111-1111-4111-8111-111111111111','a2222222-2222-4222-8222-222222222222');
set local role authenticated;
select set_config('request.jwt.claim.sub','a2222222-2222-4222-8222-222222222222',true);
do $$ declare n integer; begin
 select count(*) into n from public.messages;
 if n<>0 then raise exception 'Blocked recipient still sees history: %', n; end if;
end $$;
select set_config('request.jwt.claim.sub','a1111111-1111-4111-8111-111111111111',true);
do $$ declare n integer; begin
 select count(*) into n from public.messages;
 if n<>0 then raise exception 'Blocker still sees history: %', n; end if;
end $$;
do $$ begin
 insert into public.messages(sender_id, recipient_id, body) values
  ('a1111111-1111-4111-8111-111111111111','a2222222-2222-4222-8222-222222222222','bloqueei mesmo assim');
 raise exception 'Message while blocked was allowed';
exception when insufficient_privilege then null;
end $$;

-- 9b. Com bloqueio, marcar como lida também não faz nada: a mensagem
-- anterior continua não lida, porque ninguém a está lendo.
reset role;
delete from public.messages;
delete from public.blocks where blocker_id='a1111111-1111-4111-8111-111111111111';
insert into public.messages(sender_id, recipient_id, body) values
 ('a2222222-2222-4222-8222-222222222222','a1111111-1111-4111-8111-111111111111','antes do bloqueio');
insert into public.blocks(blocker_id, blocked_id) values
 ('a1111111-1111-4111-8111-111111111111','a2222222-2222-4222-8222-222222222222');
set local role authenticated;
select set_config('request.jwt.claim.sub','a1111111-1111-4111-8111-111111111111',true);
select public.mark_conversation_read('a2222222-2222-4222-8222-222222222222');
do $$ declare n integer; begin
 select count(*) into n from public.messages where read_at is not null;
 if n<>0 then raise exception 'mark_conversation_read worked despite block: %', n; end if;
end $$;

-- 10. Anônimo não lê nem envia.
reset role;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ declare n integer; begin
 select count(*) into n from public.messages;
 raise exception 'Anonymous could read messages (% rows)', n;
exception when insufficient_privilege then null;
end $$;

reset role;
rollback;
