-- REVIEW ONLY. Do not apply with all historical migrations or from app startup.
-- Silenciar conversas (pedido do Marco em 22/11/2026): preferência por par de
-- pessoas. O ORBIT não tem notificações push: hoje silenciar esconde a
-- contagem de não lidas da conversa na lista, e só isso. Nada aqui promete
-- supressão de notificações que não existem. Cada pessoa só vê e altera as
-- próprias preferências.
begin;

create table public.conversation_mutes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  other_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, other_id),
  constraint conversation_mutes_no_self check (user_id <> other_id)
);

alter table public.conversation_mutes enable row level security;
revoke all on public.conversation_mutes from anon, authenticated;
grant select, insert, delete on public.conversation_mutes to authenticated;

-- Silenciar e dessilenciar como si mesmo. Sem update: a preferência só
-- existe ou não existe.
create policy conversation_mutes_add on public.conversation_mutes for insert to authenticated
  with check (user_id = auth.uid() and user_id <> other_id);
create policy conversation_mutes_read_own on public.conversation_mutes for select to authenticated
  using (user_id = auth.uid());
create policy conversation_mutes_remove_own on public.conversation_mutes for delete to authenticated
  using (user_id = auth.uid());
commit;
