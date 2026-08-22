-- Local/dev seed. All users share the password: password123

-- Auth users (profiles are created by the on_auth_user_created trigger)
insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
   raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
   confirmation_token, recovery_token, email_change, email_change_token_new)
values
  ('00000000-0000-0000-0000-000000000000', 'ad9f30b9-72e3-4d16-b8d8-0df35ccc3d96',
   'authenticated', 'authenticated', 'axl.santos@icc.dev',
   crypt('password123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"name":"Axl Santos"}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'd830cd72-fc56-46a3-8c85-caf438d2dd38',
   'authenticated', 'authenticated', 'mario.pon@icc.dev',
   crypt('password123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"name":"Mario Pon"}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '94341ad6-f5bc-48c2-aea3-7be4f817cff3',
   'authenticated', 'authenticated', 'christian.rivera@icc.dev',
   crypt('password123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"name":"Christian Rivera"}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '1d193a45-2930-42e9-b771-814c49c92681',
   'authenticated', 'authenticated', 'eduard.chinchilla@icc.dev',
   crypt('password123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"name":"Eduard Chinchilla"}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a9ac2733-cd8b-49c1-901c-46daf209dc1a',
   'authenticated', 'authenticated', 'gadi.orellana@icc.dev',
   crypt('password123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"name":"Gadi Orellana"}',
   now(), now(), '', '', '', '')
on conflict (id) do nothing;

insert into auth.identities
  (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select
  gen_random_uuid(), u.id, u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email', now(), now(), now()
from auth.users u
where not exists (
  select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email'
);

insert into public.profiles (id, name, email, avatar_url)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'name', split_part(u.email, '@', 1)),
  u.email,
  u.raw_user_meta_data ->> 'avatar_url'
from auth.users u
on conflict (id) do nothing;

-- Organization membership (org + projects are created by the migration)
insert into public.organization_members (organization_id, profile_id, role)
select
  (select id from public.organizations where slug = 'icc'),
  p.id,
  case when p.email = 'axl.santos@icc.dev' then 'admin' else 'member' end
from public.profiles p
on conflict do nothing;

-- Incidents
insert into public.incidents (id, project_id, title, description, severity, status, owner_id, created_at, updated_at, resolved_at)
select x.id::uuid, p.id, x.title, x.description, x.severity::incident_severity, x.status::incident_status, x.owner_id::uuid, x.created_at, x.updated_at, x.resolved_at
from (values
  ('a0000000-0000-0000-0000-000000000001', 'CORE',
   'API gateway returning 502s in us-east',
   'Load balancer health checks are failing intermittently for the API gateway fleet in us-east. Roughly 18% of requests are affected.',
   'critical', 'investigating', 'ad9f30b9-72e3-4d16-b8d8-0df35ccc3d96',
   now() - interval '45 minutes', now() - interval '5 minutes', null),
  ('a0000000-0000-0000-0000-000000000002', 'PAY',
   'Checkout latency above 3s p95',
   'Payment provider webhooks are slow, pushing checkout latency past SLO. Conversion is dropping on mobile.',
   'high', 'identified', 'd830cd72-fc56-46a3-8c85-caf438d2dd38',
   now() - interval '3 hours', now() - interval '20 minutes', null),
  ('a0000000-0000-0000-0000-000000000003', 'WEB',
   'Elevated error rate on search service',
   'Search cluster is shedding load after a bad index rollout. Fallback to cached results is active.',
   'high', 'monitoring', '94341ad6-f5bc-48c2-aea3-7be4f817cff3',
   now() - interval '7 hours', now() - interval '1 hour', null),
  ('a0000000-0000-0000-0000-000000000004', 'CORE',
   'Suspicious login attempts from single ASN',
   'Security noticed a spike of credential-stuffing attempts against the admin panel. WAF rules under review.',
   'medium', 'investigating', '1d193a45-2930-42e9-b771-814c49c92681',
   now() - interval '5 hours', now() - interval '2 hours', null),
  ('a0000000-0000-0000-0000-000000000005', 'CORE',
   'Failed deployment: notifications service v2.14',
   'Canary rollout failed migration step and was halted. Notifications are degraded for ~5% of users.',
   'medium', 'identified', 'd830cd72-fc56-46a3-8c85-caf438d2dd38',
   now() - interval '1 day', now() - interval '3 hours', null),
  ('a0000000-0000-0000-0000-000000000006', 'WEB',
   'CDN cache hit ratio dropped to 60%',
   'A config push invalidated most edge caches. Origin is holding but costs are spiking.',
   'low', 'monitoring', 'a9ac2733-cd8b-49c1-901c-46daf209dc1a',
   now() - interval '2 days', now() - interval '6 hours', null),
  ('a0000000-0000-0000-0000-000000000007', 'PAY',
   'Stripe webhook delivery delays',
   'Third-party provider reports degraded webhook delivery. Reconciliation job is catching up asynchronously.',
   'low', 'investigating', null,
   now() - interval '90 minutes', now() - interval '30 minutes', null),
  ('a0000000-0000-0000-0000-000000000008', 'CORE',
   'Database primary failover in eu-west',
   'Planned failover triggered by hardware alert. Brief write unavailability of ~40 seconds.',
   'critical', 'resolved', 'ad9f30b9-72e3-4d16-b8d8-0df35ccc3d96',
   now() - interval '2 days', now() - interval '1 day 20 hours', now() - interval '1 day 20 hours'),
  ('a0000000-0000-0000-0000-000000000009', 'WEB',
   'Image uploads failing for HEIC files',
   'Conversion workers crashed on malformed HEIC metadata. Fix deployed and backfill completed.',
   'medium', 'resolved', 'd830cd72-fc56-46a3-8c85-caf438d2dd38',
   now() - interval '3 days', now() - interval '2 days 4 hours', now() - interval '2 days 4 hours'),
  ('a0000000-0000-0000-0000-000000000010', 'CORE',
   'SSL certificate expiry on legacy domain',
   'Cert auto-renewal was pointed at a decommissioned DNS zone. Renewed manually and automation fixed.',
   'high', 'resolved', '94341ad6-f5bc-48c2-aea3-7be4f817cff3',
   now() - interval '4 days', now() - interval '3 days 12 hours', now() - interval '3 days 12 hours'),
  ('a0000000-0000-0000-0000-000000000011', 'CORE',
   'Background job queue backlog',
   'Email digest queue grew past 200k jobs after a worker deploy loop. Workers scaled out, backlog drained.',
   'low', 'resolved', '1d193a45-2930-42e9-b771-814c49c92681',
   now() - interval '5 days', now() - interval '4 days 18 hours', now() - interval '4 days 18 hours'),
  ('a0000000-0000-0000-0000-000000000012', 'CORE',
   'Feature flag service timeout spikes',
   'SDK clients timing out on flag evaluation, falling back to defaults. Vendor incident confirmed.',
   'medium', 'monitoring', 'a9ac2733-cd8b-49c1-901c-46daf209dc1a',
   now() - interval '10 hours', now() - interval '90 minutes', null)
) as x(id, project, title, description, severity, status, owner_id, created_at, updated_at, resolved_at)
join public.projects p on p.key_prefix = x.project
order by x.created_at;

-- Activity history (trigger disabled so seeded updated_at timestamps survive)
alter table public.incident_updates disable trigger on_update_posted;

insert into public.incident_updates (incident_id, author_id, message, created_at) values
  ('a0000000-0000-0000-0000-000000000001', 'ad9f30b9-72e3-4d16-b8d8-0df35ccc3d96', 'Declaring SEV-1. 502 rate at 18% on the us-east gateway fleet. Paging on-call network team.', now() - interval '44 minutes'),
  ('a0000000-0000-0000-0000-000000000001', 'd830cd72-fc56-46a3-8c85-caf438d2dd38', 'Health checks fail only on instances launched after 14:00 UTC. Suspecting the new AMI.', now() - interval '30 minutes'),
  ('a0000000-0000-0000-0000-000000000001', 'ad9f30b9-72e3-4d16-b8d8-0df35ccc3d96', 'Draining traffic from the new instance group. Error rate down to 9%.', now() - interval '12 minutes'),
  ('a0000000-0000-0000-0000-000000000001', '94341ad6-f5bc-48c2-aea3-7be4f817cff3', 'Confirmed: missing kernel param in the new AMI breaks keepalive under load. Rollback in progress.', now() - interval '5 minutes'),

  ('a0000000-0000-0000-0000-000000000002', 'd830cd72-fc56-46a3-8c85-caf438d2dd38', 'p95 checkout latency at 3.4s, SLO is 1.5s. Correlates with payment webhook processing times.', now() - interval '3 hours'),
  ('a0000000-0000-0000-0000-000000000002', 'd830cd72-fc56-46a3-8c85-caf438d2dd38', 'Root cause identified: synchronous webhook verification against a slow provider endpoint.', now() - interval '2 hours'),
  ('a0000000-0000-0000-0000-000000000002', 'ad9f30b9-72e3-4d16-b8d8-0df35ccc3d96', 'Moving verification to the async queue behind a feature flag. Testing in staging now.', now() - interval '20 minutes'),

  ('a0000000-0000-0000-0000-000000000003', '94341ad6-f5bc-48c2-aea3-7be4f817cff3', 'Bad index rollout on search-7 shard. Reverting to yesterday''s snapshot.', now() - interval '7 hours'),
  ('a0000000-0000-0000-0000-000000000003', '94341ad6-f5bc-48c2-aea3-7be4f817cff3', 'Snapshot restored. Serving stale-but-correct results while reindexing runs.', now() - interval '4 hours'),
  ('a0000000-0000-0000-0000-000000000003', 'ad9f30b9-72e3-4d16-b8d8-0df35ccc3d96', 'Error rate back under 0.5%. Keeping in monitoring until reindex completes (~2h left).', now() - interval '1 hour'),

  ('a0000000-0000-0000-0000-000000000004', '1d193a45-2930-42e9-b771-814c49c92681', '~40k failed logins from a single ASN in 30 min. No successful compromises detected so far.', now() - interval '5 hours'),
  ('a0000000-0000-0000-0000-000000000004', 'ad9f30b9-72e3-4d16-b8d8-0df35ccc3d96', 'Rate limiting tightened on /admin/login. Reviewing WAF managed rules for the ASN block.', now() - interval '2 hours'),

  ('a0000000-0000-0000-0000-000000000005', 'd830cd72-fc56-46a3-8c85-caf438d2dd38', 'Canary failed on migration 0042 (lock timeout on notifications table). Rollout halted automatically.', now() - interval '1 day'),
  ('a0000000-0000-0000-0000-000000000005', '1d193a45-2930-42e9-b771-814c49c92681', 'Push notifications degraded for canary cohort (~5%). Email/SMS unaffected.', now() - interval '20 hours'),
  ('a0000000-0000-0000-0000-000000000005', 'd830cd72-fc56-46a3-8c85-caf438d2dd38', 'Migration rewritten to batch updates. Scheduling retry during low-traffic window tonight.', now() - interval '3 hours'),

  ('a0000000-0000-0000-0000-000000000006', 'a9ac2733-cd8b-49c1-901c-46daf209dc1a', 'Cache hit ratio dropped from 94% to 60% after the header normalization config push.', now() - interval '2 days'),
  ('a0000000-0000-0000-0000-000000000006', '94341ad6-f5bc-48c2-aea3-7be4f817cff3', 'Config reverted. Hit ratio recovering slowly as caches warm up. Origin autoscaled to absorb load.', now() - interval '6 hours'),

  ('a0000000-0000-0000-0000-000000000007', 'd830cd72-fc56-46a3-8c85-caf438d2dd38', 'Stripe status page confirms webhook delays. Our reconciliation job is picking up missed events.', now() - interval '80 minutes'),
  ('a0000000-0000-0000-0000-000000000007', 'a9ac2733-cd8b-49c1-901c-46daf209dc1a', 'No lost payments detected. Orders reconcile within ~10 minutes. Monitoring provider status.', now() - interval '30 minutes'),

  ('a0000000-0000-0000-0000-000000000008', 'ad9f30b9-72e3-4d16-b8d8-0df35ccc3d96', 'SMART alerts on primary db-eu-1. Initiating planned failover to replica.', now() - interval '2 days'),
  ('a0000000-0000-0000-0000-000000000008', 'ad9f30b9-72e3-4d16-b8d8-0df35ccc3d96', 'Failover complete. 40s of write unavailability. All replicas healthy and in sync.', now() - interval '1 day 21 hours'),
  ('a0000000-0000-0000-0000-000000000008', 'd830cd72-fc56-46a3-8c85-caf438d2dd38', 'Post-failover checks green for 1h. Resolving. Postmortem scheduled for Thursday.', now() - interval '1 day 20 hours'),

  ('a0000000-0000-0000-0000-000000000009', 'd830cd72-fc56-46a3-8c85-caf438d2dd38', 'Conversion workers crash-looping on HEIC files with malformed EXIF. ~2% of uploads failing.', now() - interval '3 days'),
  ('a0000000-0000-0000-0000-000000000009', '94341ad6-f5bc-48c2-aea3-7be4f817cff3', 'Patched the metadata parser to skip invalid EXIF blocks. Deploying to workers.', now() - interval '2 days 8 hours'),
  ('a0000000-0000-0000-0000-000000000009', 'd830cd72-fc56-46a3-8c85-caf438d2dd38', 'Backfill of failed uploads complete. All conversions green. Resolving.', now() - interval '2 days 4 hours'),

  ('a0000000-0000-0000-0000-000000000010', '94341ad6-f5bc-48c2-aea3-7be4f817cff3', 'Cert expired on legacy.example.com at 02:00 UTC. Browsers showing warnings.', now() - interval '4 days'),
  ('a0000000-0000-0000-0000-000000000010', '94341ad6-f5bc-48c2-aea3-7be4f817cff3', 'Manual renewal issued and deployed. Root cause: renewal automation pointed at a dead DNS zone.', now() - interval '3 days 20 hours'),
  ('a0000000-0000-0000-0000-000000000010', 'ad9f30b9-72e3-4d16-b8d8-0df35ccc3d96', 'Automation fixed and verified against staging. Resolving.', now() - interval '3 days 12 hours'),

  ('a0000000-0000-0000-0000-000000000011', '1d193a45-2930-42e9-b771-814c49c92681', 'Digest queue at 200k+ jobs after worker deploy loop. Consumers scaled 3x.', now() - interval '5 days'),
  ('a0000000-0000-0000-0000-000000000011', '1d193a45-2930-42e9-b771-814c49c92681', 'Backlog drained. Deploy pipeline fixed to prevent restart loops. Resolving.', now() - interval '4 days 18 hours'),

  ('a0000000-0000-0000-0000-000000000012', 'a9ac2733-cd8b-49c1-901c-46daf209dc1a', 'Flag evaluations timing out at ~8%. SDKs falling back to default values as designed.', now() - interval '10 hours'),
  ('a0000000-0000-0000-0000-000000000012', '94341ad6-f5bc-48c2-aea3-7be4f817cff3', 'Vendor confirmed incident on their side. Increased SDK cache TTL to reduce evaluation calls.', now() - interval '5 hours'),
  ('a0000000-0000-0000-0000-000000000012', 'a9ac2733-cd8b-49c1-901c-46daf209dc1a', 'Vendor reports recovery. Timeout rate at 0.3% and dropping. Monitoring for another hour.', now() - interval '90 minutes');

alter table public.incident_updates enable trigger on_update_posted;

-- Board ordering: most recent activity first inside each column
update public.incidents i
set position = n.rn
from (
  select
    id,
    row_number() over (
      partition by status
      order by coalesce(resolved_at, updated_at) desc
    ) as rn
  from public.incidents
) n
where i.id = n.id;

insert into public.notifications (recipient_id, actor_id, incident_id, incident_key, incident_title, type, read_at, created_at)
select
  n.recipient_id, n.actor_id, i.id, i.key, i.title, n.type, n.read_at, n.created_at
from (values
  ('ad9f30b9-72e3-4d16-b8d8-0df35ccc3d96'::uuid, 'd830cd72-fc56-46a3-8c85-caf438d2dd38'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'update_posted', null::timestamptz, now() - interval '20 minutes'),
  ('ad9f30b9-72e3-4d16-b8d8-0df35ccc3d96'::uuid, '94341ad6-f5bc-48c2-aea3-7be4f817cff3'::uuid, 'a0000000-0000-0000-0000-000000000008'::uuid, 'status_changed', null::timestamptz, now() - interval '2 hours'),
  ('ad9f30b9-72e3-4d16-b8d8-0df35ccc3d96'::uuid, '1d193a45-2930-42e9-b771-814c49c92681'::uuid, 'a0000000-0000-0000-0000-000000000004'::uuid, 'assigned', now() - interval '1 day', now() - interval '1 day 2 hours')
) as n(recipient_id, actor_id, incident_id, type, read_at, created_at)
join public.incidents i on i.id = n.incident_id;

insert into public.incident_watchers (incident_id, profile_id)
select distinct u.incident_id, u.author_id
from public.incident_updates u
where u.author_id is not null
on conflict do nothing;

insert into public.incident_watchers (incident_id, profile_id)
select i.id, i.owner_id
from public.incidents i
where i.owner_id is not null
on conflict do nothing;
