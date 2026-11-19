-- Run after migrations against a disposable Supabase development database.
-- Fixtures roll back; no pgTAP extension required. Use SQL Editor as postgres.
begin;
insert into auth.users(id) values
 ('11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-222222222222'),
 ('33333333-3333-4333-8333-333333333333');
insert into public.media_items(id,title,category) values
 ('44444444-4444-4444-8444-444444444444','Ranking test','film');
-- 101 newer unliked reviews by distinct fixture authors.
insert into auth.users(id)
 select ('aaaa0000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid from generate_series(1,101) n;
insert into public.ratings(user_id,media_item_id,score,created_at)
 select ('aaaa0000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,
 '44444444-4444-4444-8444-444444444444',8,'2026-11-19'::timestamptz from generate_series(1,101) n;
insert into public.ratings(id,user_id,media_item_id,score,created_at) values
 ('55555555-5555-4555-8555-555555555555','22222222-2222-4222-8222-222222222222','44444444-4444-4444-8444-444444444444',9,'2020-01-01');
insert into public.rating_likes(rating_id,user_id) values
 ('55555555-5555-4555-8555-555555555555','33333333-3333-4333-8333-333333333333');
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$ declare result jsonb; begin
 result := public.discover_timeline(50);
 if result->'reviews'->0->>'rating_id' <> '55555555-5555-4555-8555-555555555555' then
   raise exception 'Old popular review was excluded from global ranking';
 end if;
 if jsonb_array_length(result->'reviews') <> 50 then raise exception 'Page limit ignored'; end if;
 if (result->>'newest')::timestamptz <> '2026-11-19'::timestamptz then raise exception 'Watermark must cover unranked recent reviews'; end if;
end $$;
reset role;
update public.ratings set visibility='private' where id='55555555-5555-4555-8555-555555555555';
set local role authenticated;
do $$ begin
 if public.discover_timeline(100)->'reviews' @> '[{"rating_id":"55555555-5555-4555-8555-555555555555"}]'::jsonb then
   raise exception 'Private review leaked';
 end if;
end $$;
reset role;
update public.ratings set visibility='public' where id='55555555-5555-4555-8555-555555555555';
insert into public.blocks(blocker_id,blocked_id) values
 ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222');
set local role authenticated;
do $$ begin
 if public.discover_timeline(100)->'reviews' @> '[{"rating_id":"55555555-5555-4555-8555-555555555555"}]'::jsonb then
   raise exception 'Blocked author leaked';
 end if;
end $$;
reset role;
rollback;
