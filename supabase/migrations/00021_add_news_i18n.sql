-- Add i18n columns for Traditional Chinese (zh-tw) to news table
ALTER TABLE public.news
  ADD COLUMN IF NOT EXISTS title_zh_tw text,
  ADD COLUMN IF NOT EXISTS excerpt_zh_tw text,
  ADD COLUMN IF NOT EXISTS content_zh_tw text;
