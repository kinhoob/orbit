-- Disposable local/dev DB only. Fixtures roll back. Never run on production.
-- Personalização por nível: catálogo, gatilho e conquistas de nível (23/11/2026).
begin;
insert into auth.users(id) values
 ('d1111111-1111-4111-8111-111111111111'),
 ('d2222222-2222-4222-8222-222222222222');
insert into public.media_items(id,title,category)
 select ('d3333333-3333-4333-8333-3333333333' || lpad(g::text, 2, '0'))::uuid, 'Obra ' || g, 'film'
 from generate_series(1, 15) g;

set local role authenticated;

-- 1. Conta nova (nível 1): catálogo é público, padrões neutros, nível 1 bloqueia itens altos.
select set_config('request.jwt.claim.sub','d1111111-1111-4111-8111-111111111111',true);
do $$ begin
 if (select count(*) from public.cosmetic_catalog) <> 25 then raise exception 'Cosmetic catalog incomplete'; end if;
 if (select button_theme from public.profiles where id = auth.uid()) <> 'ink'
   or (select profile_animation from public.profiles where id = auth.uid()) <> 'none' then
  raise exception 'Cosmetic defaults changed';
 end if;
end $$;
insert into public.ratings(user_id,media_item_id,score) values(auth.uid(),'d3333333-3333-4333-8333-333333333301',8);
-- 25 XP (15 ledger + 10 ratings_1): nível 1.
do $$ begin
 begin
  update public.profiles set button_theme='gold' where id=auth.uid();
  raise exception 'Level 3 button unexpectedly permitted at level 1';
 exception when insufficient_privilege then null; end;
 begin
  update public.profiles set profile_animation='pulse' where id=auth.uid();
  raise exception 'Level 4 animation unexpectedly permitted at level 1';
 exception when insufficient_privilege then null; end;
 begin
  update public.profiles set profile_theme='forest' where id=auth.uid();
  raise exception 'Level 3 theme unexpectedly permitted at level 1';
 exception when insufficient_privilege then null; end;
 begin
  update public.profiles set profile_animation='laser' where id=auth.uid();
  raise exception 'Unknown animation unexpectedly permitted';
 exception when check_violation then null; end;
end $$;
update public.profiles set profile_theme='neutral', button_theme='ink' where id=auth.uid();
do $$ begin
 if (select profile_theme from public.profiles where id=auth.uid()) <> 'neutral' then raise exception 'Level 1 cosmetic blocked at level 1'; end if;
end $$;

-- 2. Oito avaliações: 120 de ledger + 25 de conquistas (ratings_1+ratings_5) = nível 3.
insert into public.ratings(user_id,media_item_id,score)
 select auth.uid(), ('d3333333-3333-4333-8333-3333333333' || lpad(g::text, 2, '0'))::uuid, 7
 from generate_series(2, 8) g;
do $$ declare p jsonb := public.account_progress(); begin
 -- bônus: ratings_1 (10) + ratings_5 (15) + level_3 (25) = 50; total 170; nível 3.
 if (p->>'base_xp')::int <> 120 or (p->>'achievement_xp')::int <> 50 or (p->>'total_xp')::int <> 170 or (p->>'level')::int <> 3 then
  raise exception 'Progress with level badge: %', p;
 end if;
end $$;
do $$ declare m jsonb := public.my_achievements(); begin
 if not exists(select 1 from jsonb_array_elements(m->'achievements') a where a->>'id'='level_3' and (a->>'unlocked')::boolean and (a->>'current')::int=3) then
  raise exception 'level_3 should be unlocked with current level 3';
 end if;
 if exists(select 1 from jsonb_array_elements(m->'achievements') a where a->>'id'='level_5' and (a->>'unlocked')::boolean) then
  raise exception 'level_5 should still be locked';
 end if;
end $$;
-- Nível 3 libera botão Dourado e insígnia de nível equipável; Brilho (Nv 6) continua bloqueado.
update public.profiles set profile_theme='sky', button_theme='gold', profile_animation='sway', equipped_badges='{level_3,ratings_1}' where id=auth.uid();
do $$ begin
 begin
  update public.profiles set profile_animation='shimmer' where id=auth.uid();
  raise exception 'Level 6 animation unexpectedly permitted at level 3';
 exception when insufficient_privilege then null; end;
 begin
  update public.profiles set profile_animation='glow' where id=auth.uid();
  raise exception 'Level 5 animation unexpectedly permitted at level 3';
 exception when insufficient_privilege then null; end;
 if (select button_theme from public.profiles where id=auth.uid()) <> 'gold' then raise exception 'Level 3 button blocked at level 3'; end if;
 if (select profile_animation from public.profiles where id=auth.uid()) <> 'sway' then raise exception 'Level 3 animation blocked at level 3'; end if;
end $$;

-- 3. Reavaliar a mesma obra não muda nível nem destrava nada novo.
update public.ratings set score=10 where user_id=auth.uid() and media_item_id='d3333333-3333-4333-8333-333333333301';
delete from public.ratings where user_id=auth.uid() and media_item_id='d3333333-3333-4333-8333-333333333301';
insert into public.ratings(user_id,media_item_id,score) values(auth.uid(),'d3333333-3333-4333-8333-333333333301',10);
do $$ begin
 if (public.account_progress()->>'total_xp')::int <> 170 then raise exception 'Re-rating changed XP or level'; end if;
end $$;

-- 4. Outra conta: lê o catálogo, mas não escreve nos cosméticos de ninguém.
select set_config('request.jwt.claim.sub','d2222222-2222-4222-8222-222222222222',true);
do $$ begin
 if (select count(*) from public.cosmetic_catalog) <> 25 then raise exception 'Catalog not readable'; end if;
end $$;
-- RLS esconde a linha ou o gatilho barra; nos dois casos nada muda.
update public.profiles set button_theme='ink' where id='d1111111-1111-4111-8111-111111111111';
do $$ begin
 if (select button_theme from public.profiles where id='d1111111-1111-4111-8111-111111111111') <> 'gold' then
  raise exception 'Another account changed cosmetic choices';
 end if;
 begin
  update public.profiles set button_theme='gold', profile_animation='orbit' where id=auth.uid();
  raise exception 'High-level cosmetics unexpectedly permitted at level 1';
 exception when insufficient_privilege then null; end;
end $$;

reset role;
rollback;
