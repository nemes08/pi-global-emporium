-- 1. Dealer tier + Pi identity columns on profiles ---------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS dealer_tier text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS pi_uid text,
  ADD COLUMN IF NOT EXISTS pi_username text,
  ADD COLUMN IF NOT EXISTS pi_sandbox boolean NOT NULL DEFAULT true;

DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_dealer_tier_check
    CHECK (dealer_tier IN ('none','verified','gold','premium'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_pi_uid_key
  ON public.profiles (pi_uid) WHERE pi_uid IS NOT NULL;

-- Auto-set verified=true when dealer_tier is any paid tier
CREATE OR REPLACE FUNCTION public.profiles_sync_verified()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.dealer_tier IN ('verified','gold','premium') THEN
    NEW.verified := true;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS profiles_sync_verified_trg ON public.profiles;
CREATE TRIGGER profiles_sync_verified_trg
  BEFORE INSERT OR UPDATE OF dealer_tier ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_sync_verified();

-- 2. Reviews table ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  buyer_id uuid NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (buyer_id <> seller_id),
  UNIQUE (seller_id, buyer_id, order_id)
);

CREATE INDEX IF NOT EXISTS reviews_seller_idx ON public.reviews (seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS reviews_buyer_idx ON public.reviews (buyer_id, created_at DESC);

GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reviews readable by all" ON public.reviews;
CREATE POLICY "Reviews readable by all" ON public.reviews
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Buyer creates review with completed order" ON public.reviews;
CREATE POLICY "Buyer creates review with completed order" ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = buyer_id
    AND buyer_id <> seller_id
    AND (
      order_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = reviews.order_id
          AND o.buyer_id = auth.uid()
          AND o.seller_id = reviews.seller_id
          AND o.status IN ('paid','shipped','completed')
      )
    )
  );

DROP POLICY IF EXISTS "Buyer edits own reviews" ON public.reviews;
CREATE POLICY "Buyer edits own reviews" ON public.reviews
  FOR UPDATE TO authenticated
  USING (auth.uid() = buyer_id) WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Buyer deletes own reviews" ON public.reviews;
CREATE POLICY "Buyer deletes own reviews" ON public.reviews
  FOR DELETE TO authenticated
  USING (auth.uid() = buyer_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS update_reviews_updated_at ON public.reviews;
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Seed demo dealer tiers ---------------------------------------------------
-- Distribute tiers across seeded showcase dealers (verified/gold/premium).
WITH seeded AS (
  SELECT id,
         ROW_NUMBER() OVER (ORDER BY created_at) AS n,
         COUNT(*) OVER () AS total
  FROM public.profiles
  WHERE verified = true
)
UPDATE public.profiles p
SET dealer_tier = CASE
  WHEN s.n % 3 = 1 THEN 'premium'
  WHEN s.n % 3 = 2 THEN 'gold'
  ELSE 'verified'
END
FROM seeded s
WHERE p.id = s.id;