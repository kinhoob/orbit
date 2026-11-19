-- Run after migrations in a disposable Supabase dev database as postgres.
-- All fixtures and writes are rolled back. No actual user accounts required.
begin;
insert into auth.users(id) values('a1111111-1111-4111-8111-111111111111'),('a2222222-2222-4222-8222-222222222222');
insert into public.media_items(id,title,category) values('a3333333-3333-4333-8333-333333333333','Universe test','film');
set local role authenticated;
select set_config('request.jwt.claim.sub','a1111111-1111-4111-8111-111111111111',true);
insert into public.ratings(user_id,media_item_id,score) values('a1111111-1111-4111-8111-111111111111','a3333333-3333-4333-8333-333333333333',8);
update public.ratings set score=9 where media_item_id='a3333333-3333-4333-8333-333333333333';
delete from public.ratings where media_item_id='a3333333-3333-4333-8333-333333333333';
insert into public.ratings(user_id,media_item_id,score) values('a1111111-1111-4111-8111-111111111111','a3333333-3333-4333-8333-333333333333',9);
insert into public.collections(user_id,title) values('a1111111-1111-4111-8111-111111111111','First'),('a1111111-1111-4111-8111-111111111111','Second');
do $$ begin
 if (public.account_progress()->>'total_xp')::integer is distinct from 35 then raise exception 'XP duplicated or missing'; end if;
 if (select count(*) from public.discovery_history)<>1 then raise exception 'Discovery duplicated'; end if;
 begin
  insert into public.xp_transactions(user_id,amount,reason,reference_id) values(auth.uid(),999,'first_rating','forged');
  raise exception 'Direct XP write unexpectedly permitted';
 exception when insufficient_privilege then null; end;
 begin
  update public.profiles set profile_theme='softYellow' where id=auth.uid();
  raise exception 'Locked cosmetic unexpectedly permitted';
 exception when insufficient_privilege then null; end;
end $$;
update public.profiles set profile_theme='sky',avatar_frame='line' where id=auth.uid();
insert into public.account_settings(user_id,default_visibility) values(auth.uid(),'private');
select set_config('request.jwt.claim.sub','a2222222-2222-4222-8222-222222222222',true);
do $$ begin
 if exists(select 1 from public.xp_transactions) or exists(select 1 from public.discovery_history) or exists(select 1 from public.account_settings) then raise exception 'Another accounts private data leaked'; end if;
 if public.friend_compatibility('a1111111-1111-4111-8111-111111111111') is not null then raise exception 'Compatibility available without accepted friendship'; end if;
end $$;
reset role;
rollback;
