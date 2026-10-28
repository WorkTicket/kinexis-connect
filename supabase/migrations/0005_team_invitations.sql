create table if not exists team_invitations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  email text not null,
  role text not null check (role in ('manager', 'agent')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  invited_by_user_id uuid references auth.users(id) on delete set null,
  accepted_by_user_id uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists team_invitations_pending_email
  on team_invitations (business_id, lower(email)) where status = 'pending';

alter table team_invitations enable row level security;

create policy "owners and managers read invitations" on team_invitations for select using (
  exists (
    select 1 from memberships m
    where m.business_id = team_invitations.business_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'manager')
  )
);
