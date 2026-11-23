-- REVIEW ONLY. Do not apply with all historical migrations or from app startup.
-- Denúncia no perfil de outras pessoas (pedido do Marco em 22/11/2026).
-- Registro simples e honesto: a moderação ainda não existe, então nada aqui
-- promete análise, envio ou consequência automática. A denúncia fica gravada
-- e só a pessoa que denunciou pode relê-la.
begin;

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_id uuid not null references public.profiles(id) on delete cascade,
  rating_id uuid references public.ratings(id) on delete cascade,
  reason text not null check (reason in ('spam','hate','harassment','inappropriate','other')),
  details text not null default '' check (char_length(details) <= 500),
  created_at timestamptz not null default now(),
  constraint reports_no_self check (reporter_id <> reported_id)
);
create index reports_reported on public.reports(reported_id);

alter table public.reports enable row level security;
revoke all on public.reports from anon, authenticated;
grant select, insert on public.reports to authenticated;

-- Denunciar como si mesmo, outra pessoa. Sem update nem delete: o registro
-- não é editável pela interface.
create policy reports_add on public.reports for insert to authenticated
  with check (reporter_id = auth.uid() and reporter_id <> reported_id);

-- A pessoa relê apenas as denúncias que ela mesma fez; ninguém lê as
-- denúncias recebidas e não há fila de moderação nesta fase.
create policy reports_read_own on public.reports for select to authenticated
  using (reporter_id = auth.uid());
commit;
