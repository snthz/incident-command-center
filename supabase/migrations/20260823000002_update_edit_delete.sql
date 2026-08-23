alter table public.incident_updates add column edited_at timestamptz;

alter table public.incident_updates replica identity full;
