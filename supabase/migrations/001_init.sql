-- Create profiles table
create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz default now() not null
);

-- Enable Row Level Security
alter table profiles enable row level security;

-- Policy: Users can select their own profile
create policy "Users can view own profile"
  on profiles
  for select
  using (auth.uid() = user_id);

-- Policy: Users can insert their own profile
create policy "Users can insert own profile"
  on profiles
  for insert
  with check (auth.uid() = user_id);

-- Policy: Users can update their own profile
create policy "Users can update own profile"
  on profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
