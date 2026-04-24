-- 飯舘村台湾夜市カレンダー：日毎イベント
CREATE TABLE IF NOT EXISTS iitate_calendar_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_date DATE NOT NULL UNIQUE,
  types TEXT[] NOT NULL DEFAULT '{}',
  time_range TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT iitate_calendar_events_types_check CHECK (
    types <@ ARRAY['day', 'night', 'closed', 'stage']::TEXT[]
  )
);

CREATE INDEX IF NOT EXISTS iitate_calendar_events_event_date_idx
  ON iitate_calendar_events(event_date);

-- 飯舘村台湾夜市カレンダー：月毎の補足ノート
CREATE TABLE IF NOT EXISTS iitate_calendar_month_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  year_month TEXT NOT NULL UNIQUE,
  notes TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT iitate_calendar_month_notes_year_month_format
    CHECK (year_month ~ '^\d{4}-\d{2}$')
);

-- updated_at 自動更新
CREATE OR REPLACE FUNCTION update_iitate_calendar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER iitate_calendar_events_updated_at
  BEFORE UPDATE ON iitate_calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_iitate_calendar_updated_at();

CREATE TRIGGER iitate_calendar_month_notes_updated_at
  BEFORE UPDATE ON iitate_calendar_month_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_iitate_calendar_updated_at();

-- RLS
ALTER TABLE iitate_calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE iitate_calendar_month_notes ENABLE ROW LEVEL SECURITY;

-- 公開読み取り（全イベント）
CREATE POLICY "iitate_calendar_events_public_read" ON iitate_calendar_events
  FOR SELECT USING (true);

CREATE POLICY "iitate_calendar_month_notes_public_read" ON iitate_calendar_month_notes
  FOR SELECT USING (true);

-- 管理者（service_role）は全操作可能
CREATE POLICY "iitate_calendar_events_service_role_all" ON iitate_calendar_events
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "iitate_calendar_month_notes_service_role_all" ON iitate_calendar_month_notes
  FOR ALL USING (auth.role() = 'service_role');
