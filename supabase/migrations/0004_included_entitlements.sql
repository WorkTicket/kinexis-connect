create table if not exists included_entitlements (
  business_id uuid primary key references businesses(id) on delete cascade,
  plan text not null check (plan in ('lead_system', 'plus')),
  active boolean not null default true,
  granted_by_user_id uuid references auth.users(id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table included_entitlements enable row level security;

create policy "owners read included entitlement" on included_entitlements for select using (
  exists (
    select 1 from memberships m
    where m.business_id = included_entitlements.business_id
      and m.user_id = auth.uid()
      and m.role = 'owner'
  )
);
