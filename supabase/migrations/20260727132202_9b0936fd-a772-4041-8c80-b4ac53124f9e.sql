
CREATE OR REPLACE FUNCTION public.orders_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  l_seller uuid;
  l_price numeric;
  offer_match numeric;
BEGIN
  SELECT seller_id, price_usd INTO l_seller, l_price
    FROM public.listings WHERE id = NEW.listing_id;
  IF l_seller IS NULL THEN
    RAISE EXCEPTION 'Listing % not found', NEW.listing_id;
  END IF;
  IF l_seller = NEW.buyer_id THEN
    RAISE EXCEPTION 'Buyer cannot be the seller';
  END IF;

  -- Always trust the listing for the seller.
  NEW.seller_id := l_seller;

  -- Accept the client price only if it matches the listing, or an accepted offer
  -- by this buyer on this listing. Otherwise fall back to the listing price.
  IF NEW.price_usd IS NULL OR NEW.price_usd <> l_price THEN
    SELECT amount_usd INTO offer_match
      FROM public.offers
      WHERE listing_id = NEW.listing_id
        AND buyer_id = NEW.buyer_id
        AND status = 'accepted'
        AND amount_usd = NEW.price_usd
      LIMIT 1;
    IF offer_match IS NULL THEN
      NEW.price_usd := l_price;
    END IF;
  END IF;

  -- New orders always start clean.
  NEW.status := 'pending';
  NEW.pi_tx_id := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_before_insert ON public.orders;
CREATE TRIGGER orders_before_insert
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_before_insert();

CREATE OR REPLACE FUNCTION public.orders_before_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_buyer boolean := auth.uid() IS NOT NULL AND auth.uid() = OLD.buyer_id;
  is_seller boolean := auth.uid() IS NOT NULL AND auth.uid() = OLD.seller_id;
  is_service boolean := coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '') = 'service_role';
BEGIN
  IF is_service THEN
    RETURN NEW;
  END IF;

  -- Core fields are immutable for non-service callers.
  IF NEW.listing_id IS DISTINCT FROM OLD.listing_id
     OR NEW.buyer_id IS DISTINCT FROM OLD.buyer_id
     OR NEW.seller_id IS DISTINCT FROM OLD.seller_id
     OR NEW.price_usd IS DISTINCT FROM OLD.price_usd THEN
    RAISE EXCEPTION 'listing_id, buyer_id, seller_id and price_usd cannot be changed';
  END IF;

  -- Only the payment verifier can set the Pi transaction id.
  IF NEW.pi_tx_id IS DISTINCT FROM OLD.pi_tx_id THEN
    RAISE EXCEPTION 'pi_tx_id can only be set by the payment verifier';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- 'paid' can only be set by the payment verifier.
    IF NEW.status = 'paid' THEN
      RAISE EXCEPTION 'Only the payment verifier can mark an order as paid';
    END IF;

    IF is_buyer AND NOT is_seller THEN
      IF NOT (OLD.status = 'pending' AND NEW.status = 'cancelled') THEN
        RAISE EXCEPTION 'Buyer can only cancel a pending order';
      END IF;
    ELSIF is_seller THEN
      IF NOT (
           (OLD.status = 'pending' AND NEW.status = 'cancelled')
        OR (OLD.status = 'paid'    AND NEW.status IN ('shipped','refunded'))
        OR (OLD.status = 'shipped' AND NEW.status IN ('completed','refunded'))
      ) THEN
        RAISE EXCEPTION 'Seller cannot transition order from % to %', OLD.status, NEW.status;
      END IF;
    ELSE
      RAISE EXCEPTION 'Only order participants can update this order';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_before_update ON public.orders;
CREATE TRIGGER orders_before_update
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_before_update();
