begin;
create extension if not exists pgcrypto;
create type public.media_category as enum ('film','series','anime','music','album','book','game','other');
create type public.friendship_status as enum ('pending','accepted','rejected');
create type public.content_visibility as enum ('public','friends','private');

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 username text unique check (username ~ '^[a-z0-9_]{3,30}$'),
 display_name text not null default '' check (char_length(display_name)<=80),
 avatar_url text, bio text not null default '' check (char_length(bio)<=500),
 created_at timestamptz not null default now()
);
create table public.blocks (
 blocker_id uuid references public.profiles(id) on delete cascade,
 blocked_id uuid references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key (blocker_id, blocked_id), check (blocker_id<>blocked_id)
);
create index blocks_reverse on public.blocks(blocked_id,blocker_id);
create function public.is_blocked(a uuid,b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.blocks where (blocker_id=a and blocked_id=b) or (blocker_id=b and blocked_id=a));
$$;
revoke all on function public.is_blocked(uuid,uuid) from public;
grant execute on function public.is_blocked(uuid,uuid) to anon,authenticated;

create table public.friendships (
 id uuid primary key default gen_random_uuid(),
 requester_id uuid not null references public.profiles(id) on delete cascade,
 addressee_id uuid not null references public.profiles(id) on delete cascade,
 status public.friendship_status not null default 'pending',
 created_at timestamptz not null default now(), check (requester_id<>addressee_id)
);
create unique index friendships_pair on public.friendships(least(requester_id,addressee_id),greatest(requester_id,addressee_id));
create index friendships_recipient on public.friendships(addressee_id,status);
create function public.are_friends(a uuid,b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select not public.is_blocked(a,b) and exists(select 1 from public.friendships
 where status='accepted' and ((requester_id=a and addressee_id=b) or (requester_id=b and addressee_id=a)));
$$;
revoke all on function public.are_friends(uuid,uuid) from public;
grant execute on function public.are_friends(uuid,uuid) to anon,authenticated;

create table public.media_items (
 id uuid primary key default gen_random_uuid(), title text not null check(char_length(title) between 1 and 300),
 category public.media_category not null, description text not null default '', cover_url text,
 release_year integer check(release_year between 1000 and 2200),
 external_source text, external_id text, created_at timestamptz not null default now(),
 unique(external_source,external_id), check((external_source is null)=(external_id is null))
);
create index media_category on public.media_items(category);
create table public.ratings (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 media_item_id uuid not null references public.media_items(id) on delete cascade,
 score numeric(3,1) not null check(score between 0 and 10), review text not null default '' check(char_length(review)<=10000),
 visibility public.content_visibility not null default 'public',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,media_item_id)
);
create index ratings_media on public.ratings(media_item_id);
create table public.saved_items (
 user_id uuid references public.profiles(id) on delete cascade,
 media_item_id uuid references public.media_items(id) on delete cascade,
 status text not null default 'planned' check(status in ('planned','in_progress','completed')),
 created_at timestamptz not null default now(), primary key(user_id,media_item_id)
);
create table public.collections (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 title text not null check(char_length(title) between 1 and 120), description text not null default '' check(char_length(description)<=1000),
 cover_url text, visibility public.content_visibility not null default 'private', created_at timestamptz not null default now()
);
create index collections_owner on public.collections(user_id);
create table public.collection_items (
 collection_id uuid references public.collections(id) on delete cascade,
 media_item_id uuid references public.media_items(id) on delete cascade,
 added_at timestamptz not null default now(), primary key(collection_id,media_item_id)
);

create function public.on_user_created() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.profiles(id) values(new.id); return new; end;
$$;
revoke all on function public.on_user_created() from public;
create trigger create_profile after insert on auth.users for each row execute function public.on_user_created();
insert into public.profiles(id) select id from auth.users on conflict do nothing;
create function public.touch_rating() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now(); return new; end;
$$;
create trigger rating_updated before update on public.ratings for each row execute function public.touch_rating();

alter table public.profiles enable row level security;
alter table public.blocks enable row level security;
alter table public.friendships enable row level security;
alter table public.media_items enable row level security;
alter table public.ratings enable row level security;
alter table public.saved_items enable row level security;
alter table public.collections enable row level security;
alter table public.collection_items enable row level security;

revoke all on public.profiles,public.blocks,public.friendships,public.media_items,public.ratings,public.saved_items,public.collections,public.collection_items from anon,authenticated;
grant select on public.profiles,public.media_items,public.ratings,public.collections,public.collection_items to anon,authenticated;
grant update(username,display_name,avatar_url,bio) on public.profiles to authenticated;
grant select,insert,delete on public.blocks,public.friendships to authenticated;
grant update(status) on public.friendships to authenticated;
grant insert,update,delete on public.ratings,public.saved_items,public.collections,public.collection_items to authenticated;
grant select on public.saved_items to authenticated;

create policy profiles_read on public.profiles for select using(not public.is_blocked(auth.uid(),id));
create policy profiles_edit on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy blocks_owner on public.blocks for all to authenticated using(blocker_id=auth.uid()) with check(blocker_id=auth.uid());
create policy friendships_read on public.friendships for select to authenticated using(auth.uid() in (requester_id,addressee_id) and not public.is_blocked(requester_id,addressee_id));
create policy friendships_request on public.friendships for insert to authenticated with check(requester_id=auth.uid() and status='pending' and not public.is_blocked(requester_id,addressee_id));
create policy friendships_respond on public.friendships for update to authenticated using(addressee_id=auth.uid() and status='pending' and not public.is_blocked(requester_id,addressee_id)) with check(addressee_id=auth.uid() and status in ('accepted','rejected') and not public.is_blocked(requester_id,addressee_id));
create policy friendships_remove on public.friendships for delete to authenticated using(auth.uid() in (requester_id,addressee_id));
create policy media_read on public.media_items for select using(true);
create policy ratings_read on public.ratings for select using(user_id=auth.uid() or (not public.is_blocked(auth.uid(),user_id) and (visibility='public' or (visibility='friends' and public.are_friends(auth.uid(),user_id)))));
create policy ratings_owner on public.ratings for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy saved_owner on public.saved_items for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy collections_read on public.collections for select using(user_id=auth.uid() or (not public.is_blocked(auth.uid(),user_id) and (visibility='public' or (visibility='friends' and public.are_friends(auth.uid(),user_id)))));
create policy collections_owner on public.collections for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy collection_items_read on public.collection_items for select using(exists(select 1 from public.collections c where c.id=collection_id));
create policy collection_items_owner on public.collection_items for all to authenticated using(exists(select 1 from public.collections c where c.id=collection_id and c.user_id=auth.uid())) with check(exists(select 1 from public.collections c where c.id=collection_id and c.user_id=auth.uid()));
commit;
