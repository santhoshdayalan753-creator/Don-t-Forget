/* Don't Forget SQL Schema for Supabase PostgreSQL */

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Table: profiles
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  theme_preference text default 'system',
  timezone text default 'UTC',
  browser_notifications_enabled boolean default true,
  email_notifications_enabled boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: memories (Main unified table for versatile personal memory entries)
-- Categories: 'task', 'reminder', 'shopping', 'link', 'idea', 'book', 'gift', 'place', 'general'
create table if not exists public.memories (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  content text,
  category text not null default 'general',
  is_favorite boolean default false not null,
  is_archived boolean default false not null,
  is_completed boolean default false not null,
  due_date timestamp with time zone,
  priority text default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  tags text[] default '{}',
  reminder_enabled boolean default true not null,
  timezone text default 'UTC',
  metadata jsonb default '{}'::jsonb, -- Specialized fields for shopping lists, book returns, links, gift budgets, dispatch logs
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: reminder_dispatch_logs (Server-side idempotency log to prevent duplicate notifications)
create table if not exists public.reminder_dispatch_logs (
  id uuid default uuid_generate_v4() primary key,
  memory_id uuid references public.memories(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  channel text not null, -- 'browser', 'email', 'in_app'
  scheduled_for timestamp with time zone not null,
  dispatched_at timestamp with time zone default timezone('utc'::text, now()) not null,
  status text not null default 'delivered', -- 'delivered', 'failed', 'retrying'
  response_payload jsonb default '{}'::jsonb,
  constraint unique_memory_channel_schedule unique (memory_id, channel, scheduled_for)
);

-- Table: shopping_lists
create table if not exists public.shopping_lists (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  category text default 'Groceries',
  is_archived boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: shopping_items
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

-- Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.memories enable row level security;
alter table public.reminder_dispatch_logs enable row level security;
alter table public.shopping_lists enable row level security;
alter table public.shopping_items enable row level security;

-- Profiles Policies
create policy "Users can view their own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can insert their own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Memories Policies
create policy "Users can view their own memories" on public.memories
  for select using (auth.uid() = user_id);

create policy "Users can insert their own memories" on public.memories
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own memories" on public.memories
  for update using (auth.uid() = user_id);

create policy "Users can delete their own memories" on public.memories
  for delete using (auth.uid() = user_id);

-- Reminder Dispatch Logs Policies
create policy "Users can view their own logs" on public.reminder_dispatch_logs
  for select using (auth.uid() = user_id);

-- Shopping Lists Policies
create policy "Users can view their own shopping lists" on public.shopping_lists
  for select using (auth.uid() = user_id);

create policy "Users can insert their own shopping lists" on public.shopping_lists
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own shopping lists" on public.shopping_lists
  for update using (auth.uid() = user_id);

create policy "Users can delete their own shopping lists" on public.shopping_lists
  for delete using (auth.uid() = user_id);

-- Shopping Items Policies
create policy "Users can view their own shopping items" on public.shopping_items
  for select using (auth.uid() = user_id);

create policy "Users can insert their own shopping items" on public.shopping_items
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own shopping items" on public.shopping_items
  for update using (auth.uid() = user_id);

create policy "Users can delete their own shopping items" on public.shopping_items
  for delete using (auth.uid() = user_id);

-- Profile creation trigger on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Indexes for performance & scheduling
create index if not exists idx_memories_user_id on public.memories(user_id);
create index if not exists idx_memories_category on public.memories(category);
create index if not exists idx_memories_due_date on public.memories(due_date);
create index if not exists idx_memories_reminder on public.memories(reminder_enabled, is_completed, is_archived, due_date);
