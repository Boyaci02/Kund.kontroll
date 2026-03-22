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
-- KUNDER (proper tabell, ersätter app_state JSONB för clients)
-- =====================
create table if not exists kunder (
  id          integer     primary key,
  name        text        not null default '',
  pkg         text        default '',
  vg          text        default '',
  ed          text        default '',
  cc          text        default '',
  lr          text        default '',
  nr          text        default '',
  ns          text        default '',
  adr         text        default '',
  cnt         text        default '',
  ph          text        default '',
  em          text        default '',
  st          text        default '' check (st in ('AKTIV', 'INAKTIV', '')),
  notes       text        default '',
  tema        jsonb       default null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table kunder disable row level security;

create trigger kunder_updated_at
  before update on kunder
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

-- =====================
-- LEADS (proper tabell)
-- =====================
create table if not exists leads (
  id          integer     primary key,
  name        text        not null default '',
  status      text        default 'Ny lead' check (status in ('Ny lead','Intresserad','Offert skickad','Överenskommelse','Förlorad')),
  email       text        default '',
  phone       text        default '',
  notes       text        default '',
  created_at  timestamptz default now()
);
alter table leads disable row level security;

-- =====================
-- ONBOARDING
-- =====================
create table if not exists ob_enrollments (
  id          integer     primary key,
  kund_id     integer     not null references kunder(id) on delete cascade,
  name        text        not null default '',
  pkg         text        default '',
  added_at    text        default '',
  priority    text        default 'normal' check (priority in ('urgent','high','normal','low')),
  "order"     integer     default 0
);
alter table ob_enrollments disable row level security;

create table if not exists ob_task_state (
  kund_id     integer     primary key references kunder(id) on delete cascade,
  state       jsonb       not null default '{}'::jsonb,
  updated_at  timestamptz default now()
);
alter table ob_task_state disable row level security;

-- =====================
-- CONTENT FLOW — DEDIKERADE TABELLER
-- Ersätter app_state['cf-state'] och app_state['cf-team']
-- =====================

-- CF-teammedlemmar
create table if not exists cf_members (
  id         bigint      primary key,
  name       text        not null default '',
  color      text        not null default '#888888',
  created_at timestamptz default now()
);
alter table cf_members disable row level security;

-- Per-kund workflow-state
create table if not exists cf_client_state (
  kund_id    integer     primary key references kunder(id) on delete cascade,
  s          text        not null default 'scheduled'
               check (s in ('scheduled','inprogress','review','delivered')),
  qc         jsonb       not null default '[]',
  qn         text        not null default '',
  rev        integer     not null default 0,
  assignee   bigint      references cf_members(id) on delete set null,
  updated_at timestamptz default now()
);
alter table cf_client_state disable row level security;

create trigger cf_client_state_updated_at
  before update on cf_client_state
  for each row execute function update_updated_at();

-- Kanban-kolumner per kund
create table if not exists content_columns (
  id         bigint      primary key,
  kund_id    integer     not null references kunder(id) on delete cascade,
  label      text        not null default '',
  col_order  integer     not null default 0
);
alter table content_columns disable row level security;
create index if not exists content_columns_kund_id on content_columns(kund_id);

-- Kanban-kort
create table if not exists content_cards (
  id         bigint      primary key,
  kund_id    integer     not null references kunder(id) on delete cascade,
  column_id  bigint      not null references content_columns(id) on delete cascade,
  title      text        not null default '',
  notes      text        not null default '',
  hook       text        not null default '',
  status     text        not null default 'idea'
               check (status in ('idea','planned','filming','editing','published')),
  assignee   text        not null default '',
  card_order integer     not null default 0,
  created_at timestamptz default now()
);
alter table content_cards disable row level security;
create index if not exists content_cards_column_id on content_cards(column_id);
create index if not exists content_cards_kund_id   on content_cards(kund_id);

-- Kortkommentarer
create table if not exists card_comments (
  id         bigint      primary key,
  card_id    bigint      not null references content_cards(id) on delete cascade,
  text       text        not null default '',
  author     text        not null default '',
  created_at timestamptz default now()
);
alter table card_comments disable row level security;
create index if not exists card_comments_card_id on card_comments(card_id);

-- Videoidé-rader (arbetsyta / ContentTable)
create table if not exists content_rows (
  id         bigint      primary key,
  kund_id    integer     not null references kunder(id) on delete cascade,
  title      text        not null default '',
  format     text        not null default '',
  pub_date   text        not null default '',
  hook       text        not null default '',
  notes      text        not null default '',
  comments   text        not null default '',
  status     text        not null default ''
               check (status in ('Todo','In progress','Done','')),
  row_order  integer     not null default 0,
  created_at timestamptz default now()
);
alter table content_rows disable row level security;
create index if not exists content_rows_kund_id on content_rows(kund_id);
