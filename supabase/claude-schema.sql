-- Claude Integration Schema
-- Kör detta i Supabase SQL Editor: https://supabase.com/dashboard

-- =====================
-- TASKS
-- =====================
create table if not exists claude_tasks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  assigned_to text,
  status text default 'pending' check (status in ('pending', 'in_progress', 'done')),
  priority text default 'medium' check (priority in ('high', 'medium', 'low')),
  bolag text default 'syns_nu' check (bolag in ('syns_nu', 'illumo', 'general')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger claude_tasks_updated_at
  before update on claude_tasks
  for each row execute function update_updated_at();

-- =====================
-- LEADS
-- =====================
create table if not exists claude_leads (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  company text,
  phone text,
  email text,
  status text default 'Ny lead' check (status in ('Ny lead', 'Intresserad', 'Offert skickad', 'Överenskommelse', 'Förlorad')),
  bolag text default 'syns_nu' check (bolag in ('syns_nu', 'illumo')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create trigger claude_leads_updated_at
  before update on claude_leads
  for each row execute function update_updated_at();

-- =====================
-- DISABLE RLS (enklast för intern användning)
-- =====================
alter table claude_tasks disable row level security;
alter table claude_leads disable row level security;
