-- Migration: YATDA_Category_Users
-- Junction table: which users can see/be assigned tickets under a given category.
-- Replaces the single-column assigned_users field from the spec.

create table "YATDA_Category_Users" (
  category_id uuid not null references "YATDA_Categories" (category_id) on delete cascade,
  user_id     uuid not null references "YATDA_Users" (user_id) on delete cascade,
  added_at    timestamptz not null default now(),
  primary key (category_id, user_id)
);

comment on table "YATDA_Category_Users" is 'Users who can view/be assigned to tickets within a category';
