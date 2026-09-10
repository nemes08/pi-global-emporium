CREATE OR REPLACE FUNCTION public.orders_before_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  is_buyer boolean := auth.uid() IS NOT NULL AND auth.uid() = OLD.buyer_id;
  is_seller boolean := auth.uid() IS NOT NULL AND auth.uid() = OLD.seller_id;
  is_service boolean := coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '') = 'service_role';
  is_internal boolean := coalesce(current_setting('app.internal_escrow', true), '') = 'on';
BEGIN
  IF is_service OR is_internal THEN
    RETURN NEW;
  END IF;

  IF NEW.listing_id IS DISTINCT FROM OLD.listing_id
     OR NEW.buyer_id IS DISTINCT FROM OLD.buyer_id
     OR NEW.seller_id IS DISTINCT FROM OLD.seller_id
     OR NEW.price_usd IS DISTINCT FROM OLD.price_usd THEN
    RAISE EXCEPTION 'listing_id, buyer_id, seller_id and price_usd cannot be changed';
  END IF;

  IF NEW.pi_tx_id IS DISTINCT FROM OLD.pi_tx_id THEN
    RAISE EXCEPTION 'pi_tx_id can only be set by the payment verifier';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
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
$function$;

CREATE OR REPLACE FUNCTION public.escrows_before_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  is_buyer boolean := auth.uid() IS NOT NULL AND auth.uid() = OLD.buyer_id;
  is_seller boolean := auth.uid() IS NOT NULL AND auth.uid() = OLD.seller_id;
  is_admin boolean := auth.uid() IS NOT NULL AND app_private.has_role(auth.uid(),'admin');
  is_service boolean := coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role','') = 'service_role';
BEGIN
  IF OLD.status IN ('released','refunded') AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'This escrow is already settled and cannot change state again';
  END IF;
  IF NEW.status = 'released' AND OLD.status IS DISTINCT FROM 'released' THEN
    IF OLD.funded_at IS NULL OR OLD.pi_payment_id IS NULL THEN
      RAISE EXCEPTION 'An escrow that was never funded by a verified Pi payment cannot be released';
    END IF;
    IF OLD.status NOT IN ('funded','shipped','delivered','disputed') THEN
      RAISE EXCEPTION 'Escrow cannot be released from state %', OLD.status;
    END IF;
  END IF;
  IF NEW.status = 'refunded' AND OLD.status IS DISTINCT FROM 'refunded' THEN
    IF OLD.status NOT IN ('funded','shipped','delivered','disputed') THEN
      RAISE EXCEPTION 'Escrow cannot be refunded from state %', OLD.status;
    END IF;
  END IF;

  IF NOT is_service THEN
    IF NEW.order_id IS DISTINCT FROM OLD.order_id
       OR NEW.buyer_id IS DISTINCT FROM OLD.buyer_id
       OR NEW.seller_id IS DISTINCT FROM OLD.seller_id
       OR NEW.amount_usd IS DISTINCT FROM OLD.amount_usd THEN
      RAISE EXCEPTION 'Escrow core fields are immutable';
    END IF;
    IF (NEW.pi_tx_id IS DISTINCT FROM OLD.pi_tx_id OR NEW.pi_payment_id IS DISTINCT FROM OLD.pi_payment_id) AND NOT is_admin THEN
      RAISE EXCEPTION 'Pi transaction fields can only be set by the payment verifier';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.status = 'funded' AND NOT is_admin THEN
        RAISE EXCEPTION 'Only the payment verifier can fund an escrow';
      END IF;
      IF NOT is_admin THEN
        IF is_seller AND NOT (
             (OLD.status = 'funded'   AND NEW.status IN ('shipped','refunded'))
          OR (OLD.status = 'shipped'  AND NEW.status = 'refunded')
          OR (OLD.status = 'awaiting_payment' AND NEW.status = 'cancelled')
          OR (OLD.status IN ('funded','shipped','delivered') AND NEW.status = 'disputed')
        ) THEN
          RAISE EXCEPTION 'Seller cannot move escrow from % to %', OLD.status, NEW.status;
        END IF;
        IF is_buyer AND NOT is_seller AND NOT (
             (OLD.status = 'awaiting_payment' AND NEW.status = 'cancelled')
          OR (OLD.status = 'shipped' AND NEW.status IN ('delivered','disputed'))
          OR (OLD.status = 'delivered' AND NEW.status IN ('released','disputed'))
          OR (OLD.status = 'funded' AND NEW.status = 'disputed')
        ) THEN
          RAISE EXCEPTION 'Buyer cannot move escrow from % to %', OLD.status, NEW.status;
        END IF;
        IF NOT is_buyer AND NOT is_seller THEN
          RAISE EXCEPTION 'Only escrow participants can update this escrow';
        END IF;
      END IF;
    END IF;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.updated_at := now();
    IF NEW.status = 'funded'    AND NEW.funded_at    IS NULL THEN NEW.funded_at := now(); END IF;
    IF NEW.status = 'shipped'   AND NEW.shipped_at   IS NULL THEN NEW.shipped_at := now(); END IF;
    IF NEW.status = 'delivered' AND NEW.delivered_at IS NULL THEN NEW.delivered_at := now(); END IF;
    IF NEW.status = 'released'  AND NEW.released_at  IS NULL THEN NEW.released_at := now(); END IF;
    IF NEW.status = 'refunded'  AND NEW.refunded_at  IS NULL THEN NEW.refunded_at := now(); END IF;
  END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.escrows_after_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE label text; l_listing uuid;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.escrow_events (escrow_id, status, actor_id)
    VALUES (NEW.id, NEW.status, auth.uid());
    label := replace(NEW.status::text, '_', ' ');
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (NEW.buyer_id, 'escrow', 'Escrow update', 'Your escrow is now ' || label || '.', '/escrow'),
           (NEW.seller_id, 'escrow', 'Escrow update', 'Escrow for your sale is now ' || label || '.', '/escrow');

    IF NEW.status IN ('released','refunded') THEN
      INSERT INTO public.activity_logs (actor_id, action, entity_type, entity_id, meta)
      VALUES (auth.uid(), 'escrow_' || NEW.status::text, 'escrow', NEW.id,
              jsonb_build_object('order_id', NEW.order_id, 'amount_usd', NEW.amount_usd,
                                 'pi_payment_id', NEW.pi_payment_id, 'pi_tx_id', NEW.pi_tx_id));

      PERFORM set_config('app.internal_escrow', 'on', true);
      SELECT listing_id INTO l_listing FROM public.orders WHERE id = NEW.order_id;
      IF NEW.status = 'released' THEN
        UPDATE public.orders SET status = 'completed' WHERE id = NEW.order_id AND status <> 'completed';
        IF l_listing IS NOT NULL THEN
          UPDATE public.listings SET status = 'sold' WHERE id = l_listing AND status <> 'sold';
        END IF;
      ELSE
        UPDATE public.orders SET status = 'refunded' WHERE id = NEW.order_id AND status <> 'refunded';
        IF l_listing IS NOT NULL THEN
          UPDATE public.listings SET status = 'active' WHERE id = l_listing AND status = 'reserved';
        END IF;
      END IF;
      PERFORM set_config('app.internal_escrow', 'off', true);
    END IF;
  END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.reviews_before_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.reviews
    WHERE seller_id = NEW.seller_id AND buyer_id = NEW.buyer_id
  ) THEN
    RAISE EXCEPTION 'You have already reviewed this seller';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.orders
    WHERE buyer_id = NEW.buyer_id
      AND seller_id = NEW.seller_id
      AND status IN ('paid','shipped','completed')
  ) THEN
    RAISE EXCEPTION 'Only buyers with a paid or completed order can review this seller';
  END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS reviews_bi ON public.reviews;
CREATE TRIGGER reviews_bi BEFORE INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.reviews_before_insert();