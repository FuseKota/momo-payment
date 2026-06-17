-- Add English (en) i18n columns to news table
ALTER TABLE public.news
  ADD COLUMN IF NOT EXISTS title_en text,
  ADD COLUMN IF NOT EXISTS excerpt_en text,
  ADD COLUMN IF NOT EXISTS content_en text;
