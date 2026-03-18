-- Migration: YATDA_Users
-- App-level user profile, linked 1:1 to Supabase auth.users.
-- role: 'admin' | 'member' | 'viewer'
-- user_origin: which connector account this user was imported from (nullable for native signups)

create table "YATDA_Users" (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  username      text not null unique,
  display_name  text,
  avatar_url    text,
  role          text not null default 'member'
                  check (role in ('admin', 'member', 'viewer')),
  points        integer not null default 0,
  user_origin   uuid references "YATDA_Connectors" (connector_id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table "YATDA_Users" is 'App-level user profiles extending Supabase auth.users';
comment on column "YATDA_Users".user_origin is 'Connector this user account was sourced from; NULL for native signups';
comment on column "YATDA_Users".points is 'Gamification points accumulated from completed tickets';

-- Keep updated_at current
create or replace function yatda_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_yatda_users_updated_at on "YATDA_Users";
create trigger trg_yatda_users_updated_at
  before update on "YATDA_Users"
  for each row execute function yatda_set_updated_at();

-- Auto-create profile row when a new auth user is created
create or replace function yatda_handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into "YATDA_Users" (user_id, username, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function yatda_handle_new_user();
