-- news テーブル
CREATE TABLE IF NOT EXISTS news (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  excerpt TEXT,
  category TEXT NOT NULL DEFAULT '福島もも娘',
  slug TEXT UNIQUE NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at 自動更新
CREATE OR REPLACE FUNCTION update_news_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER news_updated_at
  BEFORE UPDATE ON news
  FOR EACH ROW
  EXECUTE FUNCTION update_news_updated_at();

-- RLS
ALTER TABLE news ENABLE ROW LEVEL SECURITY;

-- 公開済みニュースは誰でも読める
CREATE POLICY "news_public_read" ON news
  FOR SELECT USING (is_published = true);

-- 管理者（service_role）は全操作可能
CREATE POLICY "news_service_role_all" ON news
  FOR ALL USING (auth.role() = 'service_role');
