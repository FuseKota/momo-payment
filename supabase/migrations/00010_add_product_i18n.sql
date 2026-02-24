-- Add i18n columns for Traditional Chinese (zh-tw) to products table
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS name_zh_tw text,
  ADD COLUMN IF NOT EXISTS description_zh_tw text,
  ADD COLUMN IF NOT EXISTS food_label_zh_tw jsonb;
