create type comment_status as enum ('active', 'deleted');

alter table board_comments
  add column status comment_status not null default 'active';
