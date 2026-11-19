begin;
create table public.account_settings (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 default_visibility public.content_visibility not null default 'public',
 show_notification_badge boolean not null default true,
 motion_preference text not null default 'system' check(motion_preference in ('system','reduce'))
);
alter table public.account_settings enable row level security;
revoke all on public.account_settings from anon, authenticated;
grant select,insert,update on public.account_settings to authenticated;
create policy settings_owner on public.account_settings for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

create table public.discovery_history (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 media_item_id uuid references public.media_items(id) on delete set null,
 title text not null, category public.media_category not null,
 discovered_at timestamptz not null default now(), unique(user_id,media_item_id)
);
create index discovery_history_owner on public.discovery_history(user_id,discovered_at desc);
alter table public.discovery_history enable row level security;
revoke all on public.discovery_history from anon, authenticated;
grant select on public.discovery_history to authenticated;
create policy history_owner on public.discovery_history for select to authenticated using(user_id=auth.uid());
-- Preserve the earliest recorded save/rating, never invent a Daily event.
insert into public.discovery_history(user_id,media_item_id,title,category,discovered_at)
 select events.user_id,events.media_item_id,m.title,m.category,min(events.created_at)
 from (select user_id,media_item_id,created_at from public.ratings union all select user_id,media_item_id,created_at from public.saved_items) events
 join public.media_items m on m.id=events.media_item_id
 group by events.user_id,events.media_item_id,m.title,m.category;
create function public.record_discovery() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.discovery_history(user_id,media_item_id,title,category,discovered_at)
 select new.user_id,m.id,m.title,m.category,new.created_at from public.media_items m where m.id=new.media_item_id
 on conflict(user_id,media_item_id) do nothing;
 return new;
end $$;
revoke all on function public.record_discovery() from public;
create trigger rating_discovered after insert on public.ratings for each row execute function public.record_discovery();
create trigger saved_discovered after insert on public.saved_items for each row execute function public.record_discovery();

create table public.xp_rules(reason text primary key, amount integer not null check(amount between 0 and 1000));
insert into public.xp_rules values('first_rating',15),('first_collection',20);
create table public.level_definitions(level integer primary key, title text not null, required_xp integer unique not null check(required_xp>=0));
insert into public.level_definitions values(1,'Iniciante',0),(2,'Explorador',50),(3,'Curioso',120),(4,'Descobridor',220),(5,'Colecionador',350),(6,'Entusiasta',500),(7,'Conhecedor',750),(8,'Especialista',1100),(9,'Visionário',1600),(10,'Lenda',2300);
create table public.xp_transactions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 amount integer not null check(amount>=0), reason text not null references public.xp_rules(reason),
 reference_id text not null, created_at timestamptz not null default now(), unique(user_id,reason,reference_id)
);
create index xp_owner on public.xp_transactions(user_id,created_at desc);
alter table public.xp_transactions enable row level security;
revoke all on public.xp_transactions from anon,authenticated;
grant select on public.xp_transactions to authenticated;
create policy xp_owner on public.xp_transactions for select to authenticated using(user_id=auth.uid());
alter table public.xp_rules enable row level security;
alter table public.level_definitions enable row level security;
revoke all on public.xp_rules,public.level_definitions from anon,authenticated;
grant select on public.xp_rules,public.level_definitions to authenticated;
create policy rules_read on public.xp_rules for select to authenticated using(true);
create policy levels_read on public.level_definitions for select to authenticated using(true);

create function public.award_participation_xp() returns trigger language plpgsql security definer set search_path='' as $$
declare why text; ref text;
begin
 if tg_table_name='ratings' then why:='first_rating'; ref:=new.media_item_id::text;
 else why:='first_collection'; ref:='first_collection'; end if;
 insert into public.xp_transactions(user_id,amount,reason,reference_id)
 select new.user_id,r.amount,why,ref from public.xp_rules r where r.reason=why
 on conflict(user_id,reason,reference_id) do nothing;
 return new;
end $$;
revoke all on function public.award_participation_xp() from public;
create trigger rating_xp after insert on public.ratings for each row execute function public.award_participation_xp();
create trigger first_collection_xp after insert on public.collections for each row execute function public.award_participation_xp();
-- Backfill once; editing/recreating the same review cannot multiply XP.
insert into public.xp_transactions(user_id,amount,reason,reference_id)
 select r.user_id,x.amount,'first_rating',r.media_item_id::text from public.ratings r cross join public.xp_rules x where x.reason='first_rating'
 on conflict do nothing;
insert into public.xp_transactions(user_id,amount,reason,reference_id)
 select distinct c.user_id,x.amount,'first_collection','first_collection' from public.collections c cross join public.xp_rules x where x.reason='first_collection'
 on conflict do nothing;

create function public.account_progress() returns jsonb language sql stable security invoker set search_path='' as $$
 with totals as (select coalesce(sum(amount),0) as xp,count(*) filter(where reason='first_rating') as reviews,bool_or(reason='first_collection') as collection from public.xp_transactions where user_id=auth.uid()),
 current_level as (select l.* from public.level_definitions l,totals t where l.required_xp<=t.xp order by required_xp desc limit 1)
 select jsonb_build_object('total_xp',t.xp,'level',l.level,'title',l.title,'floor_xp',l.required_xp,
 'next_xp',(select min(required_xp) from public.level_definitions where required_xp>t.xp),
 'rated_works',t.reviews,'first_collection',coalesce(t.collection,false)) from totals t cross join current_level l;
$$;
revoke all on function public.account_progress() from public,anon;
grant execute on function public.account_progress() to authenticated;

alter table public.profiles add column profile_theme text not null default 'neutral' check(profile_theme in ('neutral','sky','softYellow'));
alter table public.profiles add column avatar_frame text not null default 'none' check(avatar_frame in ('none','line','double'));
alter table public.profiles add column profile_badge text not null default 'none' check(profile_badge in ('none','explorer','collector'));
grant update(profile_theme,avatar_frame,profile_badge) on public.profiles to authenticated;
create function public.guard_profile_cosmetics() returns trigger language plpgsql security definer set search_path='' as $$
declare xp bigint;
begin
 select coalesce(sum(amount),0) into xp from public.xp_transactions where user_id=new.id;
 if (new.profile_theme='sky' and xp<15) or (new.profile_theme='softYellow' and xp<50)
 or (new.avatar_frame='line' and xp<20) or (new.avatar_frame='double' and xp<120)
 or (new.profile_badge='explorer' and xp<15) or (new.profile_badge='collector' and xp<20) then
   raise exception 'Cosmetic not unlocked' using errcode='42501';
 end if;
 return new;
end $$;
revoke all on function public.guard_profile_cosmetics() from public;
create trigger profile_cosmetics before update of profile_theme,avatar_frame,profile_badge on public.profiles for each row execute function public.guard_profile_cosmetics();

create table public.compatibility_settings(singleton boolean primary key default true check(singleton), minimum_common integer not null default 5 check(minimum_common>=1));
insert into public.compatibility_settings values(true,5);
alter table public.compatibility_settings enable row level security;
revoke all on public.compatibility_settings from anon,authenticated;
grant select on public.compatibility_settings to authenticated;
create policy compatibility_config_read on public.compatibility_settings for select to authenticated using(true);
create function public.friend_compatibility(other_user uuid) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare shared integer; percent numeric; minimum integer;
begin
 if auth.uid() is null or auth.uid()=other_user or not public.are_friends(auth.uid(),other_user) then return null; end if;
 select minimum_common into minimum from public.compatibility_settings where singleton;
 select count(*),round(greatest(0,least(100,100*(1-avg(abs(a.score-b.score))/10)))) into shared,percent
 from public.ratings a join public.ratings b on b.media_item_id=a.media_item_id
 where a.user_id=auth.uid() and b.user_id=other_user;
 return jsonb_build_object('common',shared,'percent',case when shared>=minimum then percent else null end,'minimum',minimum);
end $$;
revoke all on function public.friend_compatibility(uuid) from public,anon;
grant execute on function public.friend_compatibility(uuid) to authenticated;
commit;
