-- Migration: YATDA_Workspaces
-- A workspace is either a personal board (is_personal = true, owned by one user)
-- or a shared team board. Tickets belong to a workspace.

create table "YATDA_Workspaces" (
  workspace_id  uuid primary key default uuid_generate_v4(),
  name          text not null,
  description   text,
  owner_id      uuid not null references "YATDA_Users" (user_id) on delete cascade,
  is_personal   boolean not null default false,
  icon          text,       -- emoji or URL
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table "YATDA_Workspaces" is 'Personal or shared team task boards';
comment on column "YATDA_Workspaces".is_personal is 'True = single-user personal board; False = shared team workspace';

drop trigger if exists trg_yatda_workspaces_updated_at on "YATDA_Workspaces";
create trigger trg_yatda_workspaces_updated_at
  before update on "YATDA_Workspaces"
  for each row execute function yatda_set_updated_at();

-- Auto-create a personal workspace when a new user profile is created
create or replace function yatda_create_personal_workspace()
returns trigger language plpgsql security definer as $$
begin
  insert into "YATDA_Workspaces" (name, owner_id, is_personal)
  values (new.username || '''s Board', new.user_id, true);
  return new;
end;
$$;

drop trigger if exists trg_yatda_personal_workspace on "YATDA_Users";
create trigger trg_yatda_personal_workspace
  after insert on "YATDA_Users"
  for each row execute function yatda_create_personal_workspace();
