-- Migration: YATDA_Workspace_Members
-- Junction table: user membership in a shared workspace.
-- The workspace owner is always implicitly a member (admin role).
-- role: 'admin' | 'member' | 'viewer'

create table "YATDA_Workspace_Members" (
  workspace_id uuid not null references "YATDA_Workspaces" (workspace_id) on delete cascade,
  user_id      uuid not null references "YATDA_Users" (user_id) on delete cascade,
  role         text not null default 'member'
                 check (role in ('admin', 'member', 'viewer')),
  joined_at    timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

comment on table "YATDA_Workspace_Members" is 'User membership and roles within a shared workspace';

-- When a personal workspace is created the owner is automatically a member.
-- For team workspaces, the owner is added as admin upon creation.
create or replace function yatda_add_owner_as_member()
returns trigger language plpgsql security definer as $$
begin
  insert into "YATDA_Workspace_Members" (workspace_id, user_id, role)
  values (new.workspace_id, new.owner_id, 'admin')
  on conflict do nothing;
  return new;
end;
$$;

create trigger trg_yatda_workspace_owner_member
  after insert on "YATDA_Workspaces"
  for each row execute function yatda_add_owner_as_member();
