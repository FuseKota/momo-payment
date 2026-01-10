-- Add images array column to products table
-- This allows products to have multiple images displayed in a slider on the detail page

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS images jsonb DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.products.images IS 'Array of image URLs for product gallery. First image is the main image.';
