-- =====================================================================
-- Kunder Kontroll — Fullständigt Supabase-schema
-- Kör i Supabase SQL Editor: https://supabase.com/dashboard
-- Säkert att köra flera gånger (IF NOT EXISTS / CREATE OR REPLACE)
-- =====================================================================

-- =====================
-- APP STATE (primärdata)
-- =====================
-- Lagrar hela appens state som JSONB:
--   id = "main"  → DB-objektet (kunder, leads, kontakter, onboarding, schema, notiser)
--   id = "tasks" → uppgiftsarrayen (Task[])
create table if not exists app_state (
  id          text        primary key,
  data        jsonb       not null default '{}'::jsonb,
  updated_at  timestamptz default now()
);

alter table app_state disable row level security;

-- =====================
-- PUSH-PRENUMERATIONER
-- =====================
create table if not exists push_subscriptions (
  id          uuid        default gen_random_uuid() primary key,
  team_member text        not null,
  endpoint    text        not null unique,
  auth_key    text        not null,
  p256dh      text        not null,
  created_at  timestamptz default now()
);

alter table push_subscriptions disable row level security;

-- =====================
-- CLAUDE-INTEGRATION (behålls för bakåtkompatibilitet)
-- =====================
create table if not exists claude_tasks (
  id          uuid   default gen_random_uuid() primary key,
  title       text   not null,
  description text,
  assigned_to text,
  status      text   default 'pending' check (status in ('pending', 'in_progress', 'done')),
  priority    text   default 'medium'  check (priority in ('high', 'medium', 'low')),
  bolag       text   default 'syns_nu' check (bolag in ('syns_nu', 'illumo', 'general')),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table if not exists claude_leads (
  id          uuid   default gen_random_uuid() primary key,
  name        text   not null,
  company     text,
  phone       text,
  email       text,
  status      text   default 'Ny lead' check (status in ('Ny lead', 'Intresserad', 'Offert skickad', 'Överenskommelse', 'Förlorad')),
  bolag       text   default 'syns_nu' check (bolag in ('syns_nu', 'illumo')),
  notes       text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table claude_tasks disable row level security;
alter table claude_leads disable row level security;

-- =====================
-- KUNDFILER (dokument, avtal, PDF:er per kund)
-- =====================
-- Metadata-tabell — själva filerna lagras i Supabase Storage (bucket: kund-filer)
create table if not exists customer_files (
  id          uuid        default gen_random_uuid() primary key,
  kund_id     integer     not null,
  name        text        not null,
  path        text        not null,
  size        integer,
  uploaded_at timestamptz default now()
);

alter table customer_files disable row level security;

-- Auto-update updated_at trigger (delas av claude_tasks och claude_leads)
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

create trigger claude_leads_updated_at
  before update on claude_leads
  for each row execute function update_updated_at();

-- =====================
-- MARKNADSFÖRINGSPLANER
-- =====================
create table if not exists marketing_plans (
  id              uuid        default gen_random_uuid() primary key,
  kund_id         integer     not null,
  status          text        default 'draft' check (status in ('generating', 'draft', 'active', 'completed')),
  main_goal       text,
  opportunity     text,
  current_problem text,
  area_analysis   text,
  trend_analysis  text,
  month1_goal     text,
  month1_subgoals jsonb       default '[]'::jsonb,
  month2_goal     text,
  month2_subgoals jsonb       default '[]'::jsonb,
  month3_goal     text,
  month3_subgoals jsonb       default '[]'::jsonb,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table marketing_plans disable row level security;

create trigger marketing_plans_updated_at
  before update on marketing_plans
  for each row execute function update_updated_at();
