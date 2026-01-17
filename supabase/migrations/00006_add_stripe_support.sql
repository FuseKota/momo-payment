-- ===========================================
-- Migration: Add Stripe support
-- ===========================================

-- 1. Add Stripe columns to payments table
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS stripe_session_id text,
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
ADD COLUMN IF NOT EXISTS stripe_environment text;

-- 2. Create index for stripe_session_id lookup
CREATE INDEX IF NOT EXISTS idx_payments_stripe_session_id
ON public.payments(stripe_session_id);

-- 3. Create Stripe webhook events table for idempotency
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL
);

-- 4. Enable RLS on stripe_webhook_events
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- 5. RLS policy for stripe_webhook_events (admin only)
CREATE POLICY "stripe_webhook_events_admin_all"
ON public.stripe_webhook_events FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 6. Add STRIPE to payment_method enum
-- Note: PostgreSQL requires this syntax for adding enum values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'STRIPE'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payment_method')
  ) THEN
    ALTER TYPE public.payment_method ADD VALUE 'STRIPE';
  END IF;
END$$;

-- 7. Update orders shipping rules constraint to include STRIPE
-- Note: Constraint update is in 00007 migration due to PostgreSQL enum limitation
-- (Cannot use new enum value in same transaction)
