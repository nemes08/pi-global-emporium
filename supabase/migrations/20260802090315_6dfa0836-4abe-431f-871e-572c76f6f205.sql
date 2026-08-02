-- ============ ESCROW ============
CREATE TYPE public.escrow_status AS ENUM (
  'awaiting_payment','funded','shipped','delivered','released','refunded','disputed','cancelled'
);
CREATE TYPE public.dispute_status AS ENUM ('open','under_review','resolved_buyer','resolved_seller','closed');
CREATE TYPE public.report_status AS ENUM ('open','reviewing','actioned','dismissed');
CREATE TYPE public.moderation_status AS ENUM ('pending','approved','rejected');

CREATE TABLE public.escrows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  amount_usd numeric NOT NULL DEFAULT 0,
  status public.escrow_status NOT NULL DEFAULT 'awaiting_payment',
  pi_payment_id text,
  pi_tx_id text,
  funded_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  released_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.escrows TO authenticated;
GRANT ALL ON public.escrows TO service_role;
ALTER TABLE public.escrows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants view escrows" ON public.escrows FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Participants update escrows" ON public.escrows FOR UPDATE TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins insert escrows" ON public.escrows FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.escrow_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_id uuid NOT NULL REFERENCES public.escrows(id) ON DELETE CASCADE,
  status public.escrow_status NOT NULL,
  actor_id uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.escrow_events TO authenticated;
GRANT ALL ON public.escrow_events TO service_role;
ALTER TABLE public.escrow_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants view escrow events" ON public.escrow_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.escrows e WHERE e.id = escrow_events.escrow_id
    AND (e.buyer_id = auth.uid() OR e.seller_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

CREATE TABLE public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  escrow_id uuid REFERENCES public.escrows(id) ON DELETE CASCADE,
  opened_by uuid NOT NULL,
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  reason text NOT NULL,
  details text,
  status public.dispute_status NOT NULL DEFAULT 'open',
  resolution text,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.disputes TO authenticated;
GRANT ALL ON public.disputes TO service_role;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants view disputes" ON public.disputes FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Participants open disputes" ON public.disputes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = opened_by AND (auth.uid() = buyer_id OR auth.uid() = seller_id));
CREATE POLICY "Admins resolve disputes" ON public.disputes FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- auto-create escrow for every order
CREATE OR REPLACE FUNCTION public.orders_after_insert_escrow()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e_id uuid;
BEGIN
  INSERT INTO public.escrows (order_id, buyer_id, seller_id, amount_usd, status)
  VALUES (NEW.id, NEW.buyer_id, NEW.seller_id, NEW.price_usd, 'awaiting_payment')
  RETURNING id INTO e_id;
  INSERT INTO public.escrow_events (escrow_id, status, actor_id, note)
  VALUES (e_id, 'awaiting_payment', NEW.buyer_id, 'Order created — awaiting Pi payment');
  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (NEW.seller_id, 'escrow', 'New order received', 'A buyer placed an order. Escrow is awaiting payment.', '/escrow');
  RETURN NEW;
END $$;
CREATE TRIGGER orders_escrow_ai AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_after_insert_escrow();

-- guard escrow transitions + timeline + notifications
CREATE OR REPLACE FUNCTION public.escrows_before_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  is_buyer boolean := auth.uid() IS NOT NULL AND auth.uid() = OLD.buyer_id;
  is_seller boolean := auth.uid() IS NOT NULL AND auth.uid() = OLD.seller_id;
  is_admin boolean := auth.uid() IS NOT NULL AND public.has_role(auth.uid(),'admin');
  is_service boolean := coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role','') = 'service_role';
BEGIN
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
END $$;
CREATE TRIGGER escrows_bu BEFORE UPDATE ON public.escrows
  FOR EACH ROW EXECUTE FUNCTION public.escrows_before_update();

CREATE OR REPLACE FUNCTION public.escrows_after_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE label text;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.escrow_events (escrow_id, status, actor_id)
    VALUES (NEW.id, NEW.status, auth.uid());
    label := replace(NEW.status::text, '_', ' ');
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (NEW.buyer_id, 'escrow', 'Escrow update', 'Your escrow is now ' || label || '.', '/escrow'),
           (NEW.seller_id, 'escrow', 'Escrow update', 'Escrow for your sale is now ' || label || '.', '/escrow');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER escrows_au AFTER UPDATE ON public.escrows
  FOR EACH ROW EXECUTE FUNCTION public.escrows_after_update();

REVOKE EXECUTE ON FUNCTION public.escrows_before_update() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.escrows_after_update() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.orders_after_insert_escrow() FROM anon, authenticated;

-- ============ MODERATION / REPORTS / LOGS ============
ALTER TABLE public.listings
  ADD COLUMN moderation_status public.moderation_status NOT NULL DEFAULT 'approved',
  ADD COLUMN moderation_note text;

CREATE POLICY "Admins view all listings" ON public.listings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update listings" ON public.listings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins view all orders" ON public.orders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins view all offers" ON public.offers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete reviews" ON public.reviews FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins view verifications" ON public.verification_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update verifications" ON public.verification_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update profiles" ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins insert notifications" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  reason text NOT NULL,
  details text,
  status public.report_status NOT NULL DEFAULT 'open',
  handled_by uuid,
  handled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reporter or admin views reports" ON public.reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users create reports" ON public.reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Admins update reports" ON public.reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read activity logs" ON public.activity_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins write activity logs" ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') AND auth.uid() = actor_id);

CREATE TRIGGER escrows_updated_at BEFORE UPDATE ON public.escrows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER disputes_updated_at BEFORE UPDATE ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER reports_updated_at BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_escrows_buyer ON public.escrows(buyer_id);
CREATE INDEX idx_escrows_seller ON public.escrows(seller_id);
CREATE INDEX idx_escrow_events_escrow ON public.escrow_events(escrow_id, created_at);
CREATE INDEX idx_listings_status_created ON public.listings(status, created_at DESC);
CREATE INDEX idx_listings_category ON public.listings(category);
CREATE INDEX idx_orders_buyer ON public.orders(buyer_id);
CREATE INDEX idx_orders_seller ON public.orders(seller_id);