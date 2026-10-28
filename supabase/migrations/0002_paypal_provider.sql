-- 0002_paypal_provider.sql
alter table provider_events drop constraint if exists provider_events_provider_check;
alter table provider_events add constraint provider_events_provider_check check (provider in ('twilio','stripe','paypal'));

-- additive subscription columns for PayPal
alter table subscriptions add column if not exists paypal_subscription_id text unique;
alter table subscriptions add column if not exists paypal_plan_id text;
alter table subscriptions add column if not exists billing_currency text default 'USD';
alter table subscriptions add column if not exists billing_amount numeric;
alter table subscriptions add column if not exists last_payment_at timestamptz;
alter table subscriptions add column if not exists canceled_at timestamptz;
alter table subscriptions add column if not exists last_verified_at timestamptz;
