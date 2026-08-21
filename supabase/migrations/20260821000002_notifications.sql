create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  incident_id uuid references public.incidents(id) on delete cascade,
  incident_key text not null,
  incident_title text not null,
  type text not null check (type in ('update_posted', 'status_changed', 'assigned')),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_recipient_created_idx
  on public.notifications (recipient_id, created_at desc);

alter table public.notifications enable row level security;

create policy "Recipients can read their notifications"
  on public.notifications for select
  to authenticated
  using (recipient_id = (select auth.uid()));

create policy "Recipients can mark their notifications read"
  on public.notifications for update
  to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

alter publication supabase_realtime add table public.notifications;
