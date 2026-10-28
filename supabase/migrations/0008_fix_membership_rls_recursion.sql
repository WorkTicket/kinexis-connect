-- Membership-aware policies originally queried memberships from the
-- memberships policy itself, which causes PostgreSQL error 42P17. Keep direct
-- membership reads self-scoped and use a fixed-search-path SECURITY DEFINER
-- helper everywhere else so membership checks do not recurse through RLS.

create or replace function public.has_business_role(
  target_business_id uuid,
  allowed_roles text[] default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    where m.business_id = target_business_id
      and m.user_id = (select auth.uid())
      and (allowed_roles is null or m.role = any(allowed_roles))
  );
$$;

revoke all on function public.has_business_role(uuid, text[]) from public;
grant execute on function public.has_business_role(uuid, text[]) to authenticated;

drop policy if exists "members read business" on businesses;
create policy "members read business" on businesses for select to authenticated
  using (public.has_business_role(id));

drop policy if exists "members read memberships" on memberships;
create policy "members read memberships" on memberships for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "members read settings" on business_settings;
create policy "members read settings" on business_settings for select to authenticated
  using (public.has_business_role(business_id));

drop policy if exists "owners update settings" on business_settings;
create policy "owners update settings" on business_settings for update to authenticated
  using (public.has_business_role(business_id, array['owner']))
  with check (public.has_business_role(business_id, array['owner']));

drop policy if exists "members read phone_numbers" on phone_numbers;
create policy "members read phone_numbers" on phone_numbers for select to authenticated
  using (public.has_business_role(business_id));

drop policy if exists "members read contacts" on contacts;
create policy "members read contacts" on contacts for select to authenticated
  using (public.has_business_role(business_id));

drop policy if exists "members read calls" on calls;
create policy "members read calls" on calls for select to authenticated
  using (public.has_business_role(business_id));

drop policy if exists "members read conversations" on conversations;
create policy "members read conversations" on conversations for select to authenticated
  using (public.has_business_role(business_id));

drop policy if exists "members read messages" on messages;
create policy "members read messages" on messages for select to authenticated
  using (public.has_business_role(business_id));

drop policy if exists "members read subscriptions" on subscriptions;
create policy "members read subscriptions" on subscriptions for select to authenticated
  using (public.has_business_role(business_id));

drop policy if exists "members read notif prefs" on notification_preferences;
create policy "members read notif prefs" on notification_preferences for select to authenticated
  using (public.has_business_role(business_id));

drop policy if exists "members update notif prefs" on notification_preferences;
create policy "members update notif prefs" on notification_preferences for update to authenticated
  using (user_id = (select auth.uid()) and public.has_business_role(business_id))
  with check (user_id = (select auth.uid()) and public.has_business_role(business_id));

drop policy if exists "members insert notif prefs" on notification_preferences;
create policy "members insert notif prefs" on notification_preferences for insert to authenticated
  with check (user_id = (select auth.uid()) and public.has_business_role(business_id));

drop policy if exists "members read audit logs" on audit_logs;
create policy "members read audit logs" on audit_logs for select to authenticated
  using (public.has_business_role(business_id));

drop policy if exists "owners read included entitlement" on included_entitlements;
create policy "owners read included entitlement" on included_entitlements for select to authenticated
  using (public.has_business_role(business_id, array['owner']));

drop policy if exists "owners and managers read invitations" on team_invitations;
create policy "owners and managers read invitations" on team_invitations for select to authenticated
  using (public.has_business_role(business_id, array['owner', 'manager']));

drop policy if exists "members read phone integration" on phone_integrations;
create policy "members read phone integration" on phone_integrations for select to authenticated
  using (public.has_business_role(business_id));

drop policy if exists "owners manage phone integration" on phone_integrations;
create policy "owners manage phone integration" on phone_integrations for all to authenticated
  using (public.has_business_role(business_id, array['owner', 'manager']))
  with check (public.has_business_role(business_id, array['owner', 'manager']));

drop policy if exists "members read tollfree verification" on tollfree_verifications;
create policy "members read tollfree verification" on tollfree_verifications for select to authenticated
  using (public.has_business_role(business_id));

drop policy if exists "members read phone usage" on phone_usage;
create policy "members read phone usage" on phone_usage for select to authenticated
  using (public.has_business_role(business_id));
