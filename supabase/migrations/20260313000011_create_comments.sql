-- Migration: YATDA_Comments
-- Threaded comments on tickets. parent_id supports one level of replies.

create table "YATDA_Comments" (
  comment_id  uuid primary key default uuid_generate_v4(),
  ticket_id   uuid not null references "YATDA_Tickets" (ticket_id) on delete cascade,
  author_id   uuid not null references "YATDA_Users" (user_id) on delete cascade,
  parent_id   uuid references "YATDA_Comments" (comment_id) on delete cascade,
  content     text not null,
  edited_at   timestamptz,
  created_at  timestamptz not null default now()
);

comment on table "YATDA_Comments" is 'Comments on tickets; parent_id enables one level of threading';

create index idx_comments_ticket on "YATDA_Comments" (ticket_id, created_at);
create index idx_comments_author on "YATDA_Comments" (author_id);
