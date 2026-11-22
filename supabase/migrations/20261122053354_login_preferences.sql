-- Login/onboarding: persist preferences across devices and provision settings.
-- Apply after the existing foundation and account_universe migrations.
begin;

alter table public.account_settings
  add column if not exists taste_genres text[] not null default '{}';

insert into public.account_settings (user_id)
  select id from public.profiles
  on conflict (user_id) do nothing;

-- Keep the existing create_profile trigger; its function now provisions both rows.
create or replace function public.on_user_created() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  insert into public.account_settings (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;
revoke all on function public.on_user_created() from public;

-- Existing settings_owner RLS continues to restrict reads and writes to auth.uid().
commit;
