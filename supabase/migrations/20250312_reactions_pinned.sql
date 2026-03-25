-- Run this in your Supabase SQL Editor

-- Reactions table
create table if not exists reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references messages(id) on delete cascade,
  user_id uuid references auth.users on delete cascade,
  emoji text not null,
  created_at timestamptz default now(),
  unique(message_id, user_id, emoji)
);

alter table reactions enable row level security;
create policy "See reactions" on reactions for select using (true);
create policy "Add reaction" on reactions for insert with check (auth.uid() = user_id);
create policy "Remove reaction" on reactions for delete using (auth.uid() = user_id);

-- Pinned message per chat room
alter table chat_rooms add column if not exists pinned_message_id uuid references messages(id) on delete set null;
alter table chat_rooms add column if not exists pinned_message_text text;

-- Realtime for reactions
alter publication supabase_realtime add table reactions;
