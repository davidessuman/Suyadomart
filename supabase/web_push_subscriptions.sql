-- Table to store push subscriptions for each user
create table if not exists web_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  endpoint text not null,
  keys jsonb not null,
  created_at timestamp with time zone default now()
);

-- Index for quick lookup
create index if not exists idx_web_push_user_id on web_push_subscriptions(user_id);