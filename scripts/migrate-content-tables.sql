-- Content Flow — Dedikerade tabeller
-- Ersätter app_state['cf-state'] och app_state['cf-team'] (JSON-blobs)
-- Kör i Supabase Studio → SQL Editor
--
-- Säker att köra flera gånger (IF NOT EXISTS / OR REPLACE)

-- ── CF-teammedlemmar ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cf_members (
  id         bigint      PRIMARY KEY,
  name       text        NOT NULL DEFAULT '',
  color      text        NOT NULL DEFAULT '#888888',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE cf_members DISABLE ROW LEVEL SECURITY;

-- ── Per-kund workflow-state ───────────────────────────────────────────
-- En rad per kund: status (s), QC-lista (qc), QC-noteringar (qn),
-- revisionsantal (rev), tilldelad CF-teammedlem (assignee)
CREATE TABLE IF NOT EXISTS cf_client_state (
  kund_id    integer     PRIMARY KEY REFERENCES kunder(id) ON DELETE CASCADE,
  s          text        NOT NULL DEFAULT 'scheduled'
               CHECK (s IN ('scheduled','inprogress','review','delivered')),
  qc         jsonb       NOT NULL DEFAULT '[]',
  qn         text        NOT NULL DEFAULT '',
  rev        integer     NOT NULL DEFAULT 0,
  assignee   bigint      REFERENCES cf_members(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE cf_client_state DISABLE ROW LEVEL SECURITY;
CREATE TRIGGER cf_client_state_updated_at
  BEFORE UPDATE ON cf_client_state
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Kanban-kolumner per kund ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_columns (
  id         bigint      PRIMARY KEY,
  kund_id    integer     NOT NULL REFERENCES kunder(id) ON DELETE CASCADE,
  label      text        NOT NULL DEFAULT '',
  col_order  integer     NOT NULL DEFAULT 0
);
ALTER TABLE content_columns DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS content_columns_kund_id ON content_columns(kund_id);

-- ── Kanban-kort ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_cards (
  id         bigint      PRIMARY KEY,
  kund_id    integer     NOT NULL REFERENCES kunder(id) ON DELETE CASCADE,
  column_id  bigint      NOT NULL REFERENCES content_columns(id) ON DELETE CASCADE,
  title      text        NOT NULL DEFAULT '',
  notes      text        NOT NULL DEFAULT '',
  hook       text        NOT NULL DEFAULT '',
  status     text        NOT NULL DEFAULT 'idea'
               CHECK (status IN ('idea','planned','filming','editing','published')),
  assignee   text        NOT NULL DEFAULT '',
  card_order integer     NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE content_cards DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS content_cards_column_id ON content_cards(column_id);
CREATE INDEX IF NOT EXISTS content_cards_kund_id   ON content_cards(kund_id);

-- ── Kortkommentarer ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS card_comments (
  id         bigint      PRIMARY KEY,
  card_id    bigint      NOT NULL REFERENCES content_cards(id) ON DELETE CASCADE,
  text       text        NOT NULL DEFAULT '',
  author     text        NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE card_comments DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS card_comments_card_id ON card_comments(card_id);

-- ── Videoidé-rader (arbetsyta / ContentTable) ─────────────────────────
CREATE TABLE IF NOT EXISTS content_rows (
  id         bigint      PRIMARY KEY,
  kund_id    integer     NOT NULL REFERENCES kunder(id) ON DELETE CASCADE,
  title      text        NOT NULL DEFAULT '',
  format     text        NOT NULL DEFAULT '',
  pub_date   text        NOT NULL DEFAULT '',
  hook       text        NOT NULL DEFAULT '',
  notes      text        NOT NULL DEFAULT '',
  comments   text        NOT NULL DEFAULT '',
  status     text        NOT NULL DEFAULT ''
               CHECK (status IN ('Todo','In progress','Done','')),
  row_order  integer     NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE content_rows DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS content_rows_kund_id ON content_rows(kund_id);
