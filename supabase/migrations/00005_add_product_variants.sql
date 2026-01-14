-- Migration: 00005_add_product_variants.sql
-- Description: Add product variants support for size selection

-- =====================
-- 1. Create product_variants table
-- =====================
CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size text,
  price_yen int CHECK (price_yen IS NULL OR price_yen >= 0),
  stock_qty int CHECK (stock_qty IS NULL OR stock_qty >= 0),
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_variants_unique_size UNIQUE (product_id, size)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_active ON public.product_variants(product_id, is_active);

-- Updated_at trigger
DROP TRIGGER IF EXISTS trg_product_variants_updated_at ON public.product_variants;
CREATE TRIGGER trg_product_variants_updated_at
BEFORE UPDATE ON public.product_variants
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

-- Public can read active variants
DROP POLICY IF EXISTS "product_variants_public_read" ON public.product_variants;
CREATE POLICY "product_variants_public_read"
ON public.product_variants FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- =====================
-- 2. Modify products table
-- =====================
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS has_variants boolean NOT NULL DEFAULT false;

-- =====================
-- 3. Modify order_items table
-- =====================
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS variant_id uuid REFERENCES public.product_variants(id);
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_size text;

CREATE INDEX IF NOT EXISTS idx_order_items_variant_id ON public.order_items(variant_id);

-- =====================
-- 4. Insert hoodie variants
-- =====================
UPDATE public.products SET has_variants = true WHERE slug = 'momo-hoodie';

INSERT INTO public.product_variants (product_id, size, stock_qty, sort_order)
SELECT id, s.size, 10, s.variant_order
FROM public.products,
     LATERAL (VALUES ('M', 1), ('L', 2), ('XL', 3)) AS s(size, variant_order)
WHERE slug = 'momo-hoodie'
ON CONFLICT (product_id, size) DO NOTHING;
