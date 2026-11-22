-- REVIEW ONLY. Do not apply with all historical migrations or from app startup.
-- Move policy helpers outside the exposed API schema without dropping their OIDs.
-- Existing policy dependencies follow ALTER FUNCTION SET SCHEMA automatically.
begin;
create schema if not exists orbit_private;
revoke all on schema orbit_private from public;
grant usage on schema orbit_private to anon, authenticated;

alter function public.is_blocked(uuid,uuid) set schema orbit_private;
alter function public.are_friends(uuid,uuid) set schema orbit_private;

-- SQL string bodies are not rewritten by SET SCHEMA. Rewrite the nested call.
create or replace function orbit_private.are_friends(a uuid,b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select not orbit_private.is_blocked(a,b) and exists(select 1 from public.friendships
 where status='accepted' and ((requester_id=a and addressee_id=b) or (requester_id=b and addressee_id=a)));
$$;
revoke all on function orbit_private.is_blocked(uuid,uuid) from public;
revoke all on function orbit_private.are_friends(uuid,uuid) from public;
grant execute on function orbit_private.is_blocked(uuid,uuid) to anon,authenticated;
grant execute on function orbit_private.are_friends(uuid,uuid) to anon,authenticated;

-- The account RPC also has a textual reference. Keep it SECURITY INVOKER so
-- private ratings remain excluded by RLS, with accepted friendship required.
create or replace function public.friend_compatibility(other_user uuid) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare shared integer; percent numeric; minimum integer;
begin
 if auth.uid() is null or auth.uid()=other_user or not orbit_private.are_friends(auth.uid(),other_user) then return null; end if;
 select minimum_common into minimum from public.compatibility_settings where singleton;
 select count(*),round(greatest(0,least(100,100*(1-avg(abs(a.score-b.score))/10)))) into shared,percent
 from public.ratings a join public.ratings b on b.media_item_id=a.media_item_id
 where a.user_id=auth.uid() and b.user_id=other_user;
 return jsonb_build_object('common',shared,'percent',case when shared>=minimum then percent else null end,'minimum',minimum);
end $$;
commit;
