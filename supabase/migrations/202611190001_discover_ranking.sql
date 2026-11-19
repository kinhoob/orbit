begin;
-- Aggregate before LIMIT so older popular reviews remain eligible.
-- SECURITY INVOKER preserves ratings, profiles and rating_likes RLS,
-- including visibility and blocked users. Caller cannot choose another user.
create function public.discover_timeline(p_limit integer default 50)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with eligible as (
    select r.id as rating_id, r.score, r.review, r.created_at,
      jsonb_build_object('id', p.id, 'username', p.username,
        'display_name', p.display_name, 'avatar_url', p.avatar_url) as author,
      jsonb_build_object('id', m.id, 'title', m.title, 'category', m.category,
        'release_year', m.release_year) as media,
      (select count(*) from public.rating_likes l where l.rating_id = r.id) as like_count,
      exists(select 1 from public.rating_likes l where l.rating_id = r.id and l.user_id = auth.uid()) as liked_by_me
    from public.ratings r
    join public.profiles p on p.id = r.user_id
    join public.media_items m on m.id = r.media_item_id
    where r.visibility = 'public'
  ), ranked as (
    select * from eligible
    order by like_count desc, created_at desc, rating_id
    limit greatest(1, least(coalesce(p_limit, 50), 100))
  )
  select jsonb_build_object(
    'reviews', coalesce((select jsonb_agg(to_jsonb(ranked) order by like_count desc, created_at desc, rating_id) from ranked), '[]'::jsonb),
    'newest', (select max(created_at) from eligible)
  );
$$;
revoke all on function public.discover_timeline(integer) from public, anon;
grant execute on function public.discover_timeline(integer) to authenticated;
commit;
