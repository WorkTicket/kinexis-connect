-- Restrict user profile access to the authenticated user's own row.
alter table profiles enable row level security;

drop policy if exists "users read own profile" on profiles;
create policy "users read own profile" on profiles
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "users update own profile" on profiles;
create policy "users update own profile" on profiles
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Prevent profile owners from promoting themselves. Profile creation and role
-- changes continue to use the service-role client.
revoke update on table profiles from authenticated;
grant select on table profiles to authenticated;
grant update (full_name, updated_at) on table profiles to authenticated;

-- These operational tables are intentionally service-role only. Supabase's
-- service role bypasses RLS; no anon/authenticated policies are created.
alter table provider_events enable row level security;
alter table outbound_jobs enable row level security;
alter table consent_events enable row level security;

-- Keep both the internal subscription relation and the provider's identifier
-- so every PayPal event can be traced without parsing its payload later.
alter table provider_events
  add column if not exists subscription_id uuid references subscriptions(id) on delete set null,
  add column if not exists provider_subscription_id text;

create index if not exists provider_events_subscription_created
  on provider_events (subscription_id, created_at desc);

create index if not exists provider_events_provider_subscription
  on provider_events (provider, provider_subscription_id, created_at desc);

-- Backfill locally-created PayPal subscription events, whose event key already
-- contains the provider subscription ID.
update provider_events pe
set
  subscription_id = s.id,
  provider_subscription_id = s.paypal_subscription_id,
  business_id = coalesce(pe.business_id, s.business_id)
from subscriptions s
where pe.provider = 'paypal'
  and pe.event_type = 'subscription.created'
  and pe.event_key = 'paypal_sub_' || s.paypal_subscription_id
  and (
    pe.subscription_id is distinct from s.id
    or pe.provider_subscription_id is distinct from s.paypal_subscription_id
    or pe.business_id is null
  );
