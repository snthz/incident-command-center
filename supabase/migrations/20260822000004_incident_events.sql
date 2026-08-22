create table public.incident_events (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null check (
    type in (
      'created',
      'status_changed',
      'assignee_changed',
      'due_date_changed',
      'title_edited',
      'description_edited'
    )
  ),
  from_value text,
  to_value text,
  created_at timestamptz not null default now()
);

create index incident_events_incident_created_idx
  on public.incident_events (incident_id, created_at desc);

alter table public.incident_events enable row level security;

create policy "Authenticated users can read incident events"
  on public.incident_events for select
  to authenticated
  using (true);

alter publication supabase_realtime add table public.incident_events;
