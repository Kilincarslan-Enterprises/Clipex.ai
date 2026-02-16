-- ══════════════════════════════════════════════════════════
-- Templates table
-- ══════════════════════════════════════════════════════════
create table public.templates (
  id uuid default gen_random_uuid() primary key,
  name text not null default 'Untitled Template',
  data jsonb not null default '{}'::jsonb,
  user_id uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.templates enable row level security;

create policy "Allow public access to templates"
on public.templates
for all
using (true)
with check (true);

-- ══════════════════════════════════════════════════════════
-- Renders table (stores only output link, not actual file)
-- ══════════════════════════════════════════════════════════
create table public.renders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  template_id uuid references public.templates(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  render_job_id text,
  source text not null default 'ui' check (source in ('ui', 'api')),
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  resolution text,
  output_url text,
  error_message text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.renders enable row level security;

create policy "Allow public access to renders"
on public.renders
for all
using (true)
with check (true);
