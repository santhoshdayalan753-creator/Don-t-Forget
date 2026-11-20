-- ============================================================================
-- Don't Forget — Supabase PostgreSQL schema
-- ----------------------------------------------------------------------------
-- Idempotent: safe to re-run on an existing project. It creates/repairs tables,
-- helper functions, triggers, indexes, RLS policies and the realtime publication.
--
-- Run with:  Supabase Dashboard -> SQL Editor -> paste & run
--       or:  psql "$DATABASE_URL" -f supabase/schema.sql
--
-- Tables:
--   public.profiles               user preferences (1:1 with auth.users)
--   public.memories               every saved item (task, reminder, book, ...)
--   public.shopping_lists         shopping list headers
--   public.shopping_items         shopping list rows
--   public.reminder_dispatch_logs idempotency ledger for reminder delivery
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Keeps updated_at correct even for writes coming from SQL/edge functions.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Table: profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  theme_preference text default 'system',
  timezone text default 'UTC',
  browser_notifications_enabled boolean default true,
  email_notifications_enabled boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Repair columns for projects created with an older schema version
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists theme_preference text default 'system';
alter table public.profiles add column if not exists timezone text default 'UTC';
alter table public.profiles add column if not exists browser_notifications_enabled boolean default true;
alter table public.profiles add column if not exists email_notifications_enabled boolean default true;
-- Email reminders are opt-out; keep existing projects converged too.
alter table public.profiles alter column email_notifications_enabled set default true;
alter table public.profiles add column if not exists created_at timestamp with time zone default timezone('utc'::text, now()) not null;
alter table public.profiles add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now()) not null;

-- ---------------------------------------------------------------------------
-- Table: memories
-- ---------------------------------------------------------------------------
create table if not exists public.memories (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  content text,
  -- 'task', 'reminder', 'shopping', 'link', 'idea', 'book', 'gift', 'place', 'general'
  category text not null default 'general',
  is_favorite boolean default false not null,
  is_archived boolean default false not null,
  is_completed boolean default false not null,
  due_date timestamp with time zone,
  priority text default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  tags text[] default '{}',
  reminder_enabled boolean default true not null,
  timezone text default 'UTC',
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.memories add column if not exists metadata jsonb default '{}'::jsonb not null;
alter table public.memories add column if not exists tags text[] default '{}';
alter table public.memories add column if not exists reminder_enabled boolean default true not null;
alter table public.memories add column if not exists timezone text default 'UTC';

-- Never allow a NULL owner: a client that forgets user_id still inserts as itself.
alter table public.memories alter column user_id set default auth.uid();

-- A column DEFAULT only covers omitted columns, so an explicit `metadata: null`
-- (older cached bundles, third-party clients) would still raise 23502. Normalize
-- it on the way in so the NOT NULL contract always holds.
create or replace function public.memories_normalize_metadata()
returns trigger
language plpgsql
as $$
begin
  if new.metadata is null then
    new.metadata := '{}'::jsonb;
  end if;
  return new;
end;
$$;

drop trigger if exists memories_normalize_metadata on public.memories;
create trigger memories_normalize_metadata
  before insert or update on public.memories
  for each row execute function public.memories_normalize_metadata();

-- ---------------------------------------------------------------------------
-- Table: reminder_dispatch_logs
-- Server-side idempotency ledger: one row per (memory, channel, schedule).
-- ---------------------------------------------------------------------------
create table if not exists public.reminder_dispatch_logs (
  id uuid default uuid_generate_v4() primary key,
  memory_id uuid references public.memories(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  -- 'browser', 'email', 'in_app'
  channel text not null,
  scheduled_for timestamp with time zone not null,
  dispatched_at timestamp with time zone default timezone('utc'::text, now()) not null,
  -- 'delivered', 'failed', 'retrying', 'skipped'
  status text not null default 'delivered',
  response_payload jsonb default '{}'::jsonb not null,
  constraint unique_memory_channel_schedule unique (memory_id, channel, scheduled_for)
);

-- ---------------------------------------------------------------------------
-- Table: shopping_lists / shopping_items
-- ---------------------------------------------------------------------------
create table if not exists public.shopping_lists (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  category text default 'Groceries',
  is_archived boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.shopping_lists alter column user_id set default auth.uid();
alter table public.reminder_dispatch_logs alter column user_id set default auth.uid();

create table if not exists public.shopping_items (
  id uuid default uuid_generate_v4() primary key,
  list_id uuid references public.shopping_lists(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  item_name text not null,
  quantity text default '1',
  unit text,
  notes text,
  is_bought boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.shopping_items alter column user_id set default auth.uid();

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_memories_updated_at on public.memories;
create trigger set_memories_updated_at
  before update on public.memories
  for each row execute function public.set_updated_at();

drop trigger if exists set_shopping_lists_updated_at on public.shopping_lists;
create trigger set_shopping_lists_updated_at
  before update on public.shopping_lists
  for each row execute function public.set_updated_at();

drop trigger if exists set_shopping_items_updated_at on public.shopping_items;
create trigger set_shopping_items_updated_at
  before update on public.shopping_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auth -> profiles sync
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name),
        avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
        updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep the profile email in sync when a user changes their address
create or replace function public.handle_user_email_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
     set email = new.email,
         updated_at = timezone('utc'::text, now())
   where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute function public.handle_user_email_updated();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.memories enable row level security;
alter table public.reminder_dispatch_logs enable row level security;
alter table public.shopping_lists enable row level security;
alter table public.shopping_items enable row level security;

-- Profiles
drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Memories
drop policy if exists "Users can view their own memories" on public.memories;
create policy "Users can view their own memories" on public.memories
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own memories" on public.memories;
create policy "Users can insert their own memories" on public.memories
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own memories" on public.memories;
create policy "Users can update their own memories" on public.memories
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own memories" on public.memories;
create policy "Users can delete their own memories" on public.memories
  for delete using (auth.uid() = user_id);

-- Reminder dispatch logs (read + client-side 'in_app'/'browser' logging;
-- the email worker writes with the service role, which bypasses RLS)
drop policy if exists "Users can view their own logs" on public.reminder_dispatch_logs;
create policy "Users can view their own logs" on public.reminder_dispatch_logs
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own logs" on public.reminder_dispatch_logs;
create policy "Users can insert their own logs" on public.reminder_dispatch_logs
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own logs" on public.reminder_dispatch_logs;
create policy "Users can delete their own logs" on public.reminder_dispatch_logs
  for delete using (auth.uid() = user_id);

-- Shopping lists
drop policy if exists "Users can view their own shopping lists" on public.shopping_lists;
create policy "Users can view their own shopping lists" on public.shopping_lists
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own shopping lists" on public.shopping_lists;
create policy "Users can insert their own shopping lists" on public.shopping_lists
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own shopping lists" on public.shopping_lists;
create policy "Users can update their own shopping lists" on public.shopping_lists
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own shopping lists" on public.shopping_lists;
create policy "Users can delete their own shopping lists" on public.shopping_lists
  for delete using (auth.uid() = user_id);

-- Shopping items
drop policy if exists "Users can view their own shopping items" on public.shopping_items;
create policy "Users can view their own shopping items" on public.shopping_items
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own shopping items" on public.shopping_items;
create policy "Users can insert their own shopping items" on public.shopping_items
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own shopping items" on public.shopping_items;
create policy "Users can update their own shopping items" on public.shopping_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own shopping items" on public.shopping_items;
create policy "Users can delete their own shopping items" on public.shopping_items
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Privileges (Supabase defaults normally cover this; explicit for clarity)
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.memories to authenticated;
grant select, insert, update, delete on public.shopping_lists to authenticated;
grant select, insert, update, delete on public.shopping_items to authenticated;
grant select, insert, delete on public.reminder_dispatch_logs to authenticated;
grant all on public.profiles, public.memories, public.shopping_lists,
  public.shopping_items, public.reminder_dispatch_logs to service_role;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists idx_memories_user_id on public.memories(user_id);
create index if not exists idx_memories_category on public.memories(category);
create index if not exists idx_memories_due_date on public.memories(due_date);
create index if not exists idx_memories_reminder on public.memories(reminder_enabled, is_completed, is_archived, due_date);
create index if not exists idx_memories_user_created on public.memories(user_id, created_at desc);
create index if not exists idx_memories_user_flags on public.memories(user_id, is_archived, is_completed);
create index if not exists idx_dispatch_logs_user on public.reminder_dispatch_logs(user_id);
create index if not exists idx_shopping_lists_user on public.shopping_lists(user_id);
create index if not exists idx_shopping_items_list on public.shopping_items(list_id);
create index if not exists idx_shopping_items_user on public.shopping_items(user_id);

-- ---------------------------------------------------------------------------
-- Realtime (the app subscribes to these tables for multi-tab / multi-device
-- sync). `replica identity full` makes UPDATE/DELETE payloads complete.
-- ---------------------------------------------------------------------------
alter table public.memories replica identity full;
alter table public.shopping_lists replica identity full;
alter table public.shopping_items replica identity full;

-- Supabase creates supabase_realtime by default; create it for plain projects.
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end;
$$;

do $$
begin
  begin
    alter publication supabase_realtime add table public.memories;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.shopping_lists;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.shopping_items;
  exception when duplicate_object then null;
  end;
end;
$$;

-- ---------------------------------------------------------------------------
-- Post-install verification (run manually, useful after applying this file)
-- ---------------------------------------------------------------------------
-- 1) Tables + RLS:
--    select relname, relrowsecurity from pg_class
--     where relnamespace = 'public'::regnamespace and relkind = 'r';
-- 2) Policies:
--    select tablename, policyname, cmd from pg_policies where schemaname = 'public' order by 1,2;
-- 3) Triggers on auth.users:
--    select tgname from pg_trigger where tgrelid = 'auth.users'::regclass and not tgisinternal;
-- 4) Realtime publication:
--    select tablename from pg_publication_tables where pubname = 'supabase_realtime';
