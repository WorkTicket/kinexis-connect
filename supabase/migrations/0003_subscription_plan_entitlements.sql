-- Website-plan customers can receive Connect as an included entitlement.
alter table subscriptions drop constraint if exists subscriptions_plan_check;
alter table subscriptions add constraint subscriptions_plan_check
  check (plan in ('starter', 'professional', 'premium', 'lead_system', 'plus'));
