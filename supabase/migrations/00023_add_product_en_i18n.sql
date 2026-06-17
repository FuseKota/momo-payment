-- Add English (en) i18n columns to products table
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS name_en text,
  ADD COLUMN IF NOT EXISTS description_en text,
  ADD COLUMN IF NOT EXISTS food_label_en jsonb;
