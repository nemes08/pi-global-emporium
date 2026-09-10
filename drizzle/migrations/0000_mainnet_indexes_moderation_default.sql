CREATE UNIQUE INDEX IF NOT EXISTS escrows_pi_payment_id_key
  ON public.escrows (pi_payment_id) WHERE pi_payment_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS orders_one_open_per_buyer_listing
  ON public.orders (listing_id, buyer_id)
  WHERE status IN ('pending','paid','shipped');

ALTER TABLE public.listings ALTER COLUMN moderation_status SET DEFAULT 'pending'::moderation_status;

CREATE INDEX IF NOT EXISTS listings_public_browse_idx
  ON public.listings (status, moderation_status, created_at DESC);