-- Disposable local/dev DB only. Fixtures roll back. Never run on production.
-- Silenciar conversas: só a própria pessoa vê e altera (Marco, 22/11/2026).
begin;
insert into auth.users(id) values
 ('f1111111-1111-4111-8111-111111111111'),
 ('f2222222-2222-4222-8222-222222222222');
update public.profiles set username='silenciadora' where id='f1111111-1111-4111-8111-111111111111';
update public.profiles set username='silenciada' where id='f2222222-2222-4222-8222-222222222222';

set local role authenticated;
select set_config('request.jwt.claim.sub','f1111111-1111-4111-8111-111111111111',true);

-- 1. Silenciar vale e a pessoa relê a própria preferência.
insert into public.conversation_mutes(user_id, other_id) values
 ('f1111111-1111-4111-8111-111111111111','f2222222-2222-4222-8222-222222222222');
do $$ declare n integer; begin
 select count(*) into n from public.conversation_mutes
  where user_id='f1111111-1111-4111-8111-111111111111' and other_id='f2222222-2222-4222-8222-222222222222';
 if n<>1 then raise exception 'Own mute not readable: %', n; end if;
end $$;

-- 2. A outra pessoa não vê a preferência (não é da conta dela).
select set_config('request.jwt.claim.sub','f2222222-2222-4222-8222-222222222222',true);
do $$ declare n integer; begin
 select count(*) into n from public.conversation_mutes;
 if n<>0 then raise exception 'Other person could read mutes: %', n; end if;
end $$;

-- 3. Ninguém silencia em nome de outra pessoa.
do $$ begin
 insert into public.conversation_mutes(user_id, other_id) values
  ('f1111111-1111-4111-8111-111111111111','f2222222-2222-4222-8222-222222222222');
 raise exception 'Mute as someone else was allowed';
exception when others then
 if sqlerrm = 'Mute as someone else was allowed' then raise; end if;
end $$;

-- 4. Não silencia a si mesmo.
do $$ begin
 insert into public.conversation_mutes(user_id, other_id) values
  ('f2222222-2222-4222-8222-222222222222','f2222222-2222-4222-8222-222222222222');
 raise exception 'Self mute was allowed';
exception when others then
 if sqlerrm = 'Self mute was allowed' then raise; end if;
end $$;

-- 5. Dessilenciar remove a própria linha; a linha da outra pessoa fica intacta.
select set_config('request.jwt.claim.sub','f1111111-1111-4111-8111-111111111111',true);
delete from public.conversation_mutes
 where user_id='f1111111-1111-4111-8111-111111111111' and other_id='f2222222-2222-4222-8222-222222222222';
do $$ declare n integer; begin
 select count(*) into n from public.conversation_mutes;
 if n<>0 then raise exception 'Unmute did not delete: %', n; end if;
end $$;

-- 6. Delete como outra pessoa não toca na preferência alheia.
insert into public.conversation_mutes(user_id, other_id) values
 ('f1111111-1111-4111-8111-111111111111','f2222222-2222-4222-8222-222222222222');
select set_config('request.jwt.claim.sub','f2222222-2222-4222-8222-222222222222',true);
delete from public.conversation_mutes
 where user_id='f1111111-1111-4111-8111-111111111111' and other_id='f2222222-2222-4222-8222-222222222222';
reset role;
do $$ declare n integer; begin
 select count(*) into n from public.conversation_mutes;
 if n<>1 then raise exception 'Someone else deleted my mute: %', n; end if;
end $$;

-- 7. Sem update pela interface: a preferência só existe ou não existe.
set local role authenticated;
select set_config('request.jwt.claim.sub','f1111111-1111-4111-8111-111111111111',true);
do $$ begin
 update public.conversation_mutes set other_id=other_id;
 raise exception 'Update was allowed';
exception when others then
 if sqlerrm = 'Update was allowed' then raise; end if;
end $$;

-- 8. Anônimo não lê nem escreve: sem grant, a leitura é negada.
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
 perform count(*) from public.conversation_mutes;
 raise exception 'Anon could read mutes';
exception when insufficient_privilege then
 -- esperado: anon não tem permissão na tabela
end $$;
rollback;
