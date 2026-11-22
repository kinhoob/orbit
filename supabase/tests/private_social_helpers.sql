-- Disposable local/dev DB only. Fixtures roll back. Never run on production.
begin;
do $$ begin
 if to_regprocedure('public.is_blocked(uuid,uuid)') is not null
 or to_regprocedure('public.are_friends(uuid,uuid)') is not null then
   raise exception 'Social helpers still in exposed public schema';
 end if;
end $$;
insert into auth.users(id) values
 ('b1111111-1111-4111-8111-111111111111'),
 ('b2222222-2222-4222-8222-222222222222'),
 ('b3333333-3333-4333-8333-333333333333');
insert into public.media_items(id,title,category) values
 ('b4444444-4444-4444-8444-444444444444','Privacy fixture','film');
insert into public.ratings(user_id,media_item_id,score,visibility) values
 ('b2222222-2222-4222-8222-222222222222','b4444444-4444-4444-8444-444444444444',8,'friends');
set local role authenticated;
select set_config('request.jwt.claim.sub','b1111111-1111-4111-8111-111111111111',true);
insert into public.friendships(requester_id,addressee_id) values
 (auth.uid(),'b2222222-2222-4222-8222-222222222222');
select set_config('request.jwt.claim.sub','b2222222-2222-4222-8222-222222222222',true);
update public.friendships set status='accepted' where addressee_id=auth.uid();
select set_config('request.jwt.claim.sub','b1111111-1111-4111-8111-111111111111',true);
do $$ begin
 if (select count(*) from public.ratings)<>1 then raise exception 'Friend read broken'; end if;
 if public.friend_compatibility('b2222222-2222-4222-8222-222222222222') is null then raise exception 'Compatibility broken'; end if;
end $$;
select set_config('request.jwt.claim.sub','b3333333-3333-4333-8333-333333333333',true);
do $$ begin
 if exists(select 1 from public.ratings) then raise exception 'Friends-only rating leaked'; end if;
end $$;
select set_config('request.jwt.claim.sub','b1111111-1111-4111-8111-111111111111',true);
insert into public.blocks(blocker_id,blocked_id) values(auth.uid(),'b2222222-2222-4222-8222-222222222222');
do $$ begin
 if exists(select 1 from public.ratings) or exists(select 1 from public.friendships) then raise exception 'Block no longer filters'; end if;
end $$;
reset role;
update public.ratings set visibility='public';
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
 if (select count(*) from public.ratings)<>1 then raise exception 'Anonymous public read broken'; end if;
end $$;
reset role;
rollback;
