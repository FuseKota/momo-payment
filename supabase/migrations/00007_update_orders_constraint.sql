-- ===========================================
-- Migration: Update orders constraint for STRIPE
-- ===========================================
-- This is separated from 00006 because PostgreSQL cannot use
-- a newly added enum value in the same transaction

-- Drop the existing constraint if it exists
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_shipping_rules;

-- Create the updated constraint with STRIPE support
ALTER TABLE public.orders ADD CONSTRAINT orders_shipping_rules CHECK (
  (order_type = 'SHIPPING' AND payment_method IN ('SQUARE', 'STRIPE') AND temp_zone IS NOT NULL)
  OR
  (order_type = 'PICKUP')
);
