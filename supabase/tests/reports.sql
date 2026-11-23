-- Disposable local/dev DB only. Fixtures roll back. Never run on production.
-- Denúncia registrada sem moderação (Marco, 22/11/2026).
begin;
insert into auth.users(id) values
 ('f1111111-1111-4111-8111-111111111111'),
 ('f2222222-2222-4222-8222-222222222222');
update public.profiles set username='queixosa' where id='f1111111-1111-4111-8111-111111111111';
update public.profiles set username='denunciada' where id='f2222222-2222-4222-8222-222222222222';

set local role authenticated;
select set_config('request.jwt.claim.sub','f1111111-1111-4111-8111-111111111111',true);

-- 1. Denúncia válida é registrada e a autora pode relê-la.
insert into public.reports(reporter_id, reported_id, reason, details) values
 ('f1111111-1111-4111-8111-111111111111','f2222222-2222-4222-8222-222222222222','spam','propaganda repetida');
do $$ declare n integer; begin
 select count(*) into n from public.reports
  where reporter_id='f1111111-1111-4111-8111-111111111111' and reported_id='f2222222-2222-4222-8222-222222222222' and reason='spam';
 if n<>1 then raise exception 'Own report not readable: %', n; end if;
end $$;

-- 2. A pessoa denunciada não lê as denúncias que recebeu.
select set_config('request.jwt.claim.sub','f2222222-2222-4222-8222-222222222222',true);
do $$ declare n integer; begin
 select count(*) into n from public.reports;
 if n<>0 then raise exception 'Reported person could read reports: %', n; end if;
end $$;

-- 3. Ninguém denuncia em nome de outra pessoa.
do $$ begin
 insert into public.reports(reporter_id, reported_id, reason) values
  ('f1111111-1111-4111-8111-111111111111','f2222222-2222-4222-8222-222222222222','spam');
 raise exception 'Report as someone else was allowed';
exception when others then
 if sqlerrm = 'Report as someone else was allowed' then raise; end if;
end $$;

-- 4. Sem auto-denúncia.
do $$ begin
 insert into public.reports(reporter_id, reported_id, reason) values
  ('f2222222-2222-4222-8222-222222222222','f2222222-2222-4222-8222-222222222222','spam');
 raise exception 'Self report was allowed';
exception when others then
 if sqlerrm = 'Self report was allowed' then raise; end if;
end $$;

-- 5. Motivo fora da lista é recusado.
select set_config('request.jwt.claim.sub','f1111111-1111-4111-8111-111111111111',true);
do $$ begin
 insert into public.reports(reporter_id, reported_id, reason) values
  ('f1111111-1111-4111-8111-111111111111','f2222222-2222-4222-8222-222222222222','crime');
 raise exception 'Invalid reason was allowed';
exception when others then
 if sqlerrm = 'Invalid reason was allowed' then raise; end if;
end $$;

-- 6. Denúncia não é editável nem apagável pela interface (sem grant).
do $$ begin
 update public.reports set details='alterado' where reporter_id='f1111111-1111-4111-8111-111111111111';
 raise exception 'Report update was allowed';
exception when insufficient_privilege then null;
end $$;
do $$ begin
 delete from public.reports where reporter_id='f1111111-1111-4111-8111-111111111111';
 raise exception 'Report delete was allowed';
exception when insufficient_privilege then null;
end $$;

-- 7. Anônimo não denuncia nem lê.
reset role;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
 insert into public.reports(reporter_id, reported_id, reason) values
  ('f1111111-1111-4111-8111-111111111111','f2222222-2222-4222-8222-222222222222','spam');
 raise exception 'Anonymous report was allowed';
exception when insufficient_privilege then null;
end $$;
do $$ declare n integer; begin
 select count(*) into n from public.reports;
 raise exception 'Anonymous could read reports (% rows)', n;
exception when insufficient_privilege then null;
end $$;

reset role;
rollback;
