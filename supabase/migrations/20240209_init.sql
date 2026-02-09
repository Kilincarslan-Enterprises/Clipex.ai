-- Create projects table
create table public.projects (
  id uuid default gen_random_uuid() primary key,
  name text not null default 'Untitled Project',
  data jsonb not null default '{}'::jsonb,
  user_id uuid references auth.users(id), -- Optional for now, enabling RLS later
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.projects enable row level security;

-- Policy: Allow anonymous select/insert/update for now (since no auth flow requested yet)
-- OR if user wants "user specific", we need auth.
-- The user said: "user -> button ... template has its own id".
-- Let's allow public access for simplicity or anonymous access.
-- WARNING: This is INSECURE for production without auth.
create policy "Allow public access to projects"
on public.projects
for all
using (true)
with check (true);

-- Create storage bucket for assets
insert into storage.buckets (id, name, public)
values ('assets', 'assets', true);

-- Policy: Allow public uploads to assets
create policy "Allow public uploads"
on storage.objects
for insert
with check ( bucket_id = 'assets' );

create policy "Allow public select"
on storage.objects
for select
using ( bucket_id = 'assets' );
