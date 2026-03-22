-- Leads-tabellmigration
-- Kör dessa steg i ordning i Supabase Studio → SQL Editor

-- ── Steg 1: Skapa tabellen ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id          INTEGER      PRIMARY KEY,
  name        TEXT         NOT NULL,
  status      TEXT         NOT NULL DEFAULT 'Ny lead'
                CHECK (status IN ('Ny lead', 'Kontaktad', 'Möte bokat', 'Offert skickad', 'Vunnen', 'Förlorad')),
  email       TEXT         NOT NULL DEFAULT '',
  phone       TEXT         NOT NULL DEFAULT '',
  notes       TEXT         NOT NULL DEFAULT '',
  created_at  TEXT         NOT NULL DEFAULT ''
);

-- ── Steg 2: Migrera befintliga leads från app_state ──────────────────────────
-- Kör detta om det finns leads i app_state (kontrollera med SELECT nedan först)
-- SELECT data->'leads' FROM app_state WHERE id = 'main';

INSERT INTO leads (id, name, status, email, phone, notes, created_at)
SELECT
  (l->>'id')::int,
  l->>'name',
  COALESCE(l->>'status', 'Ny lead'),
  COALESCE(l->>'email', ''),
  COALESCE(l->>'phone', ''),
  COALESCE(l->>'notes', ''),
  COALESCE(l->>'createdAt', '')
FROM app_state,
     jsonb_array_elements(data->'leads') AS l
WHERE id = 'main'
  AND data->'leads' IS NOT NULL
  AND jsonb_array_length(data->'leads') > 0
ON CONFLICT (id) DO NOTHING;

-- ── Steg 3 (valfritt): Kontrollera att datan kom med ────────────────────────
-- SELECT * FROM leads ORDER BY id;
