-- ============================================================
-- Court Reporting Invoice System — Initial Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── Admins ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
  id          text PRIMARY KEY,
  display_name text NOT NULL,
  code         text NOT NULL UNIQUE
);

INSERT INTO admins (id, display_name, code) VALUES
  ('a1', 'Sarah Admin', 'ADMIN123'),
  ('a2', 'Mike Manager', 'ADMIN456')
ON CONFLICT (id) DO NOTHING;

-- ── Reporters ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reporters (
  id           text PRIMARY KEY,
  display_name text NOT NULL,
  code         text NOT NULL UNIQUE,
  rate_card    jsonb NOT NULL DEFAULT '{}',
  created_by   text,
  created_on   text,
  edited_by    text,
  edited_on    text
);

-- No reporter seeds — add real reporters through the Admin UI.
-- rate_card JSONB shape (all monetary values in cents):
--   hourlyRate, originalPageRate, copyPageRate,
--   lateCancelFee, cnaFee,
--   appearanceFeeFullDay, appearanceFeeHalfDay,
--   minimumTranscriptAmount, minimumTranscriptCopyAmount, videoSurcharge,
--   profileAdditionalFees (array), expediteRates (array)

-- ── Invoices ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id                  text PRIMARY KEY,
  invoice_number      text NOT NULL,
  reporter_user_id    text,
  reporter_name       text,
  status              text NOT NULL DEFAULT 'DRAFT',
  invoice_type        text NOT NULL DEFAULT 'STANDARD',
  input               jsonb DEFAULT '{}',
  pdf_link            text,
  job_id              text,
  submission_date     text,
  on_time             text,
  case_info           jsonb DEFAULT '{}',
  invoice_comment     text,
  line_items          jsonb DEFAULT '[]',
  total_cents         integer DEFAULT 0,
  return_comment      text,
  approved_at         text,
  approved_by         text,
  paid_at             text,
  paid_by             text,
  stripe_payout_id    text,
  disputed_at         text,
  disputed_by         text,
  dispute_resolved_at text,
  dispute_resolved_by text,
  dispute_close_at    text,
  closed_at           text,
  closed_by           text,
  submitted_at        text,
  audit_log           jsonb DEFAULT '[]'
);

-- ── Jobs ──────────────────────────────────────────────────
-- All job fields are stored in job_data JSONB to handle
-- the schema flexibly (17+ fields, all string-typed in app)
CREATE TABLE IF NOT EXISTS jobs (
  deposition_id text PRIMARY KEY,
  job_data      jsonb NOT NULL DEFAULT '{}'
);

-- ── Audit Log ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id      text PRIMARY KEY,
  action  text NOT NULL,
  target  text,
  by_user text,
  at_date text
);

-- No audit log seeds — log entries are created by app actions.

-- ── Settings (single row) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  id   integer PRIMARY KEY DEFAULT 1,
  data jsonb NOT NULL DEFAULT '{}',
  CONSTRAINT settings_single_row CHECK (id = 1)
);

INSERT INTO settings (id, data) VALUES (1, '{
  "expediteRates": [
    {"days": 1, "label": "1 Day",  "percent": 100, "amount": 0, "useAmount": false},
    {"days": 2, "label": "2 Days", "percent": 80,  "amount": 0, "useAmount": false},
    {"days": 3, "label": "3 Days", "percent": 60,  "amount": 0, "useAmount": false},
    {"days": 4, "label": "4 Days", "percent": 45,  "amount": 0, "useAmount": false},
    {"days": 5, "label": "5 Days", "percent": 35,  "amount": 0, "useAmount": false},
    {"days": 6, "label": "6 Days", "percent": 25,  "amount": 0, "useAmount": false},
    {"days": 7, "label": "7 Days", "percent": 15,  "amount": 0, "useAmount": false},
    {"days": 8, "label": "8 Days", "percent": 10,  "amount": 0, "useAmount": false}
  ],
  "lateCancelFee": 15000,
  "cnaFee": 12500
}')
ON CONFLICT (id) DO NOTHING;

-- ── Row Level Security ────────────────────────────────────
-- The app uses code-based auth (not Supabase Auth), so we
-- enable RLS but allow the anon key full access for now.
-- Tighten these policies once you add proper auth.

ALTER TABLE admins    ENABLE ROW LEVEL SECURITY;
ALTER TABLE reporters ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices  ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all" ON admins    FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON reporters FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON invoices  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON jobs      FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON audit_log FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON settings  FOR ALL TO anon USING (true) WITH CHECK (true);
