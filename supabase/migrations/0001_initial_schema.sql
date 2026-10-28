-- 0001_initial_schema.sql
create extension if not exists "pgcrypto";

create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  global_role text not null default 'user' check (global_role in ('user','platform_admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  industry text,
  website text,
  timezone text not null default 'America/New_York',
  status text not null default 'pending' check (status in ('pending','active','suspended','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists memberships (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','manager','agent')),
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create table if not exists business_settings (
  business_id uuid primary key references businesses(id) on delete cascade,
  forward_to_e164 text,
  forwarding_verified_at timestamptz,
  ring_timeout_seconds int not null default 20 check (ring_timeout_seconds between 10 and 40),
  auto_reply_enabled boolean not null default false,
  auto_reply_template text not null default 'Hi, this is {business_name}. Sorry we missed your call. How can we help you? Reply STOP to opt out.',
  auto_reply_cooldown_hours int not null default 24,
  quiet_hours_enabled boolean not null default true,
  quiet_start_local time not null default '21:00',
  quiet_end_local time not null default '08:00',
  after_hours_mode text not null default 'skip' check (after_hours_mode in ('hold','skip')),
  sms_consent_review_status text not null default 'not_started' check (sms_consent_review_status in ('not_started','pending','approved','rejected')),
  sms_eligibility_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists phone_numbers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  e164 text unique not null,
  twilio_phone_sid text unique not null,
  messaging_service_sid text,
  sms_registration_status text not null default 'unregistered' check (sms_registration_status in ('unregistered','pending','approved','rejected','suspended')),
  voice_enabled boolean not null default true,
  sms_enabled boolean not null default true,
  assigned_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists phone_numbers_one_per_business on phone_numbers(business_id);

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  phone_e164 text not null,
  display_name text,
  opt_out boolean not null default false,
  last_inbound_at timestamptz,
  last_contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, phone_e164)
);

create table if not exists consent_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  contact_id uuid references contacts(id) on delete cascade,
  consent_type text not null check (consent_type in ('service_sms','marketing_sms')),
  status text not null check (status in ('granted','revoked')),
  source text not null check (source in ('web_form','sms_keyword','documented_verbal','import_verified','admin_review')),
  evidence_reference text not null,
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists calls (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,
  twilio_call_sid text unique not null,
  forwarded_call_sid text,
  caller_e164 text,
  called_e164 text,
  status text not null default 'unknown' check (status in ('ringing','answered','missed','busy','failed','canceled','unknown')),
  started_at timestamptz,
  ended_at timestamptz,
  dial_status text,
  missed_reason text,
  sms_action text not null default 'not_evaluated' check (sms_action in ('not_evaluated','queued','sent','skipped','failed')),
  sms_skip_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  status text not null default 'open' check (status in ('open','resolved')),
  assigned_user_id uuid references auth.users(id) on delete set null,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, contact_id)
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  conversation_id uuid not null references conversations(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,
  call_id uuid references calls(id) on delete set null,
  direction text not null check (direction in ('inbound','outbound')),
  kind text not null check (kind in ('auto_reply','manual','customer','system')),
  twilio_message_sid text unique,
  body text not null,
  status text not null default 'queued' check (status in ('queued','sending','sent','delivered','undelivered','failed','received','blocked')),
  error_code text,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid unique not null references businesses(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  plan text not null default 'starter' check (plan in ('starter','professional','premium')),
  status text not null default 'incomplete' check (status in ('incomplete','trialing','active','past_due','unpaid','canceled','paused')),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists provider_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('twilio','stripe')),
  event_key text unique not null,
  business_id uuid references businesses(id) on delete set null,
  event_type text,
  processed_at timestamptz,
  status text not null default 'received' check (status in ('received','processed','failed')),
  error_category text,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  business_id uuid references businesses(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists notification_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  email_on_new_reply boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create table if not exists outbound_jobs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  message_id uuid not null references messages(id) on delete cascade,
  idempotency_key text unique not null,
  status text not null default 'queued' check (status in ('queued','processing','complete','failed','canceled')),
  attempts int not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- indexes
create index if not exists calls_business_started on calls(business_id, started_at desc);
create index if not exists messages_business_conv_created on messages(business_id, conversation_id, created_at desc);
create index if not exists outbound_jobs_status_next on outbound_jobs(status, next_attempt_at);
create index if not exists conversations_business_lastmsg on conversations(business_id, last_message_at desc);
create index if not exists contacts_business_phone on contacts(business_id, phone_e164);

-- RLS
alter table businesses enable row level security;
alter table memberships enable row level security;
alter table business_settings enable row level security;
alter table phone_numbers enable row level security;
alter table contacts enable row level security;
alter table consent_events enable row level security;
alter table calls enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table subscriptions enable row level security;
alter table notification_preferences enable row level security;
alter table audit_logs enable row level security;

-- memberships-based policies
create policy "members read business" on businesses for select using (
  exists (select 1 from memberships m where m.business_id = businesses.id and m.user_id = auth.uid())
);
create policy "members read memberships" on memberships for select using (
  exists (select 1 from memberships m where m.business_id = memberships.business_id and m.user_id = auth.uid())
);
create policy "members read settings" on business_settings for select using (
  exists (select 1 from memberships m where m.business_id = business_settings.business_id and m.user_id = auth.uid())
);
create policy "owners update settings" on business_settings for update using (
  exists (select 1 from memberships m where m.business_id = business_settings.business_id and m.user_id = auth.uid() and m.role='owner')
);
create policy "members read phone_numbers" on phone_numbers for select using (
  exists (select 1 from memberships m where m.business_id = phone_numbers.business_id and m.user_id = auth.uid())
);
create policy "members read contacts" on contacts for select using (
  exists (select 1 from memberships m where m.business_id = contacts.business_id and m.user_id = auth.uid())
);
create policy "members read calls" on calls for select using (
  exists (select 1 from memberships m where m.business_id = calls.business_id and m.user_id = auth.uid())
);
create policy "members read conversations" on conversations for select using (
  exists (select 1 from memberships m where m.business_id = conversations.business_id and m.user_id = auth.uid())
);
create policy "members read messages" on messages for select using (
  exists (select 1 from memberships m where m.business_id = messages.business_id and m.user_id = auth.uid())
);
create policy "members read subscriptions" on subscriptions for select using (
  exists (select 1 from memberships m where m.business_id = subscriptions.business_id and m.user_id = auth.uid())
);
create policy "members read notif prefs" on notification_preferences for select using (
  exists (select 1 from memberships m where m.business_id = notification_preferences.business_id and m.user_id = auth.uid())
);
create policy "members update notif prefs" on notification_preferences for update using (
  exists (select 1 from memberships m where m.business_id = notification_preferences.business_id and m.user_id = auth.uid())
);
create policy "members insert notif prefs" on notification_preferences for insert with check (
  exists (select 1 from memberships m where m.business_id = notification_preferences.business_id and m.user_id = auth.uid())
);
create policy "members read audit logs" on audit_logs for select using (
  exists (select 1 from memberships m where m.business_id = audit_logs.business_id and m.user_id = auth.uid())
);
