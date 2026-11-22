-- Disposable local/dev DB only. Fixtures roll back. Never run on production.
begin;
insert into auth.users(id) values
 ('c1111111-1111-4111-8111-111111111111'),
 ('c2222222-2222-4222-8222-222222222222');
insert into public.media_items(id,title,category) values
 ('c4444444-4444-4444-8444-444444444444','Favorites fixture','film');
set local role authenticated;
select set_config('request.jwt.claim.sub','c1111111-1111-4111-8111-111111111111',true);
insert into public.profile_favorites(user_id,media_item_id) values
 (auth.uid(),'c4444444-4444-4444-8444-444444444444');
do $$ begin
 begin
  insert into public.profile_favorites(user_id,media_item_id) values
   (auth.uid(),'c4444444-4444-4444-8444-444444444444');
  raise exception 'Duplicate favorite accepted';
 exception when unique_violation then null;
 end;
end $$;
select set_config('request.jwt.claim.sub','c2222222-2222-4222-8222-222222222222',true);
do $$ begin
 begin
  insert into public.profile_favorites(user_id,media_item_id) values
   ('c1111111-1111-4111-8111-111111111111','c4444444-4444-4444-8444-444444444444');
  raise exception 'Foreign favorite write accepted';
 exception when insufficient_privilege then null;
 end;
end $$;
do $$ begin
 if (select count(*) from public.profile_favorites where user_id='c1111111-1111-4111-8111-111111111111')<>1 then
  raise exception 'Public favorite read broken';
 end if;
end $$;
delete from public.profile_favorites where user_id='c1111111-1111-4111-8111-111111111111';
do $$ begin
 if (select count(*) from public.profile_favorites)<>1 then
  raise exception 'Foreign favorite delete removed rows';
 end if;
end $$;
reset role;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
 if (select count(*) from public.profile_favorites)<>1 then
  raise exception 'Anonymous favorite read broken';
 end if;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','c2222222-2222-4222-8222-222222222222',true);
insert into public.blocks(blocker_id,blocked_id) values
 (auth.uid(),'c1111111-1111-4111-8111-111111111111');
do $$ begin
 if exists(select 1 from public.profile_favorites where user_id='c1111111-1111-4111-8111-111111111111') then
  raise exception 'Blocked favorite still visible';
 end if;
end $$;
select set_config('request.jwt.claim.sub','c1111111-1111-4111-8111-111111111111',true);
delete from public.profile_favorites where user_id=auth.uid();
do $$ begin
 if exists(select 1 from public.profile_favorites) then
  raise exception 'Owner delete broken';
 end if;
end $$;
reset role;
rollback;
