create table public.incident_attachments (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  update_id uuid references public.incident_updates(id) on delete cascade,
  uploader_id uuid not null references public.profiles(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  mime_type text not null,
  size_bytes bigint not null,
  created_at timestamptz not null default now()
);

create index incident_attachments_incident_idx
  on public.incident_attachments (incident_id, created_at);

create index incident_attachments_update_idx
  on public.incident_attachments (update_id);

alter table public.incident_attachments enable row level security;

create policy "Authenticated users can read incident attachments"
  on public.incident_attachments for select
  to authenticated
  using (true);

alter table public.incident_attachments replica identity full;

alter publication supabase_realtime add table public.incident_attachments;

alter table public.incident_events drop constraint incident_events_type_check;
alter table public.incident_events add constraint incident_events_type_check check (
  type in (
    'created',
    'status_changed',
    'assignee_changed',
    'due_date_changed',
    'title_edited',
    'description_edited',
    'attachment_added',
    'attachment_removed'
  )
);

insert into storage.buckets (id, name, public, file_size_limit)
values ('attachments', 'attachments', false, 10485760)
on conflict (id) do nothing;

create policy "Authenticated users can read attachment files"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'attachments');

create policy "Authenticated users can upload attachment files"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'attachments');

create policy "Authenticated users can delete attachment files"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'attachments');
