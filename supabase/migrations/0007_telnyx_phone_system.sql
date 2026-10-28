-- Telnyx migration. This extends the original provider-neutral tables so the
-- existing inbox, analytics and entitlement logic remain the source of truth.

alter table provider_events drop constraint if exists provider_events_provider_check;
alter table provider_events add constraint provider_events_provider_check
  check (provider in ('twilio', 'stripe', 'paypal', 'telnyx'));

alter table phone_numbers alter column twilio_phone_sid drop not null;
alter table phone_numbers
  add column if not exists provider text not null default 'twilio'
    check (provider in ('twilio', 'telnyx')),
  add column if not exists telnyx_phone_number_id text unique,
  add column if not exists telnyx_voice_application_id text,
  add column if not exists telnyx_messaging_profile_id text;

alter table calls alter column twilio_call_sid drop not null;
alter table calls
  add column if not exists telnyx_call_control_id text unique,
  add column if not exists telnyx_call_leg_id text,
  add column if not exists telnyx_call_session_id text,
  add column if not exists consent_digit text,
  add column if not exists provider_occurred_at timestamptz;

alter table messages
  add column if not exists telnyx_message_id text unique,
  add column if not exists parts integer,
  add column if not exists cost_microunits bigint,
  add column if not exists cost_currency text;

create table if not exists phone_integrations (
  business_id uuid primary key references businesses(id) on delete cascade,
  existing_phone_e164 text,
  carrier text,
  forwarding_status text not null default 'not_started'
    check (forwarding_status in ('not_started', 'instructions_shown', 'testing', 'verified', 'failed', 'disabled')),
  answered_test_at timestamptz,
  unanswered_test_at timestamptz,
  caller_id_preserved boolean,
  verified_at timestamptz,
  verification_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tollfree_verifications (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  phone_number_id uuid not null references phone_numbers(id) on delete cascade,
  telnyx_verification_id text unique,
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'under_review', 'action_required', 'verified', 'rejected')),
  legal_business_name text,
  ein_last_four text,
  business_website text,
  contact_phone_e164 text,
  use_case text,
  opt_in_description text,
  rejection_reason text,
  submitted_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, phone_number_id)
);

create table if not exists telnyx_events (
  id uuid primary key default gen_random_uuid(),
  event_id text unique not null,
  event_type text not null,
  business_id uuid references businesses(id) on delete set null,
  occurred_at timestamptz,
  call_control_id text,
  message_id text,
  status text not null default 'received'
    check (status in ('received', 'processing', 'processed', 'failed', 'ignored')),
  attempts integer not null default 0,
  error_code text,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists phone_usage (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  provider_resource_id text not null,
  usage_type text not null check (usage_type in ('number', 'voice', 'sms_inbound', 'sms_outbound')),
  quantity numeric(14,4) not null default 1,
  cost_microunits bigint,
  currency text not null default 'USD',
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (provider_resource_id, usage_type)
);

create index if not exists telnyx_events_status_created on telnyx_events(status, created_at);
create index if not exists telnyx_events_call_control on telnyx_events(call_control_id);
create index if not exists phone_usage_business_occurred on phone_usage(business_id, occurred_at desc);

alter table phone_integrations enable row level security;
alter table tollfree_verifications enable row level security;
alter table telnyx_events enable row level security;
alter table phone_usage enable row level security;

create policy "members read phone integration" on phone_integrations for select using (
  exists (select 1 from memberships m where m.business_id = phone_integrations.business_id and m.user_id = auth.uid())
);
create policy "owners manage phone integration" on phone_integrations for all using (
  exists (select 1 from memberships m where m.business_id = phone_integrations.business_id and m.user_id = auth.uid() and m.role in ('owner','manager'))
) with check (
  exists (select 1 from memberships m where m.business_id = phone_integrations.business_id and m.user_id = auth.uid() and m.role in ('owner','manager'))
);
create policy "members read tollfree verification" on tollfree_verifications for select using (
  exists (select 1 from memberships m where m.business_id = tollfree_verifications.business_id and m.user_id = auth.uid())
);
create policy "members read phone usage" on phone_usage for select using (
  exists (select 1 from memberships m where m.business_id = phone_usage.business_id and m.user_id = auth.uid())
);

-- telnyx_events remains service-role only because payloads can contain caller data.
