CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC;
GRANT USAGE ON SCHEMA app_private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION app_private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;
REVOKE ALL ON FUNCTION app_private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- activity_logs
DROP POLICY "Admins read activity logs" ON public.activity_logs;
CREATE POLICY "Admins read activity logs" ON public.activity_logs FOR SELECT TO authenticated USING (app_private.has_role(auth.uid(), 'admin'));
DROP POLICY "Admins write activity logs" ON public.activity_logs;
CREATE POLICY "Admins write activity logs" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (app_private.has_role(auth.uid(), 'admin') AND auth.uid() = actor_id);

-- disputes
DROP POLICY "Admins resolve disputes" ON public.disputes;
CREATE POLICY "Admins resolve disputes" ON public.disputes FOR UPDATE TO authenticated USING (app_private.has_role(auth.uid(), 'admin')) WITH CHECK (app_private.has_role(auth.uid(), 'admin'));
DROP POLICY "Participants view disputes" ON public.disputes;
CREATE POLICY "Participants view disputes" ON public.disputes FOR SELECT TO authenticated USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR app_private.has_role(auth.uid(), 'admin'));

-- escrow_events
DROP POLICY "Participants view escrow events" ON public.escrow_events;
CREATE POLICY "Participants view escrow events" ON public.escrow_events FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.escrows e WHERE e.id = escrow_events.escrow_id AND (e.buyer_id = auth.uid() OR e.seller_id = auth.uid() OR app_private.has_role(auth.uid(), 'admin'))));

-- escrows
DROP POLICY "Admins insert escrows" ON public.escrows;
CREATE POLICY "Admins insert escrows" ON public.escrows FOR INSERT TO authenticated WITH CHECK (app_private.has_role(auth.uid(), 'admin'));
DROP POLICY "Participants update escrows" ON public.escrows;
CREATE POLICY "Participants update escrows" ON public.escrows FOR UPDATE TO authenticated USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR app_private.has_role(auth.uid(), 'admin'));
DROP POLICY "Participants view escrows" ON public.escrows;
CREATE POLICY "Participants view escrows" ON public.escrows FOR SELECT TO authenticated USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR app_private.has_role(auth.uid(), 'admin'));

-- listings
DROP POLICY "Admins update listings" ON public.listings;
CREATE POLICY "Admins update listings" ON public.listings FOR UPDATE TO authenticated USING (app_private.has_role(auth.uid(), 'admin')) WITH CHECK (app_private.has_role(auth.uid(), 'admin'));
DROP POLICY "Admins view all listings" ON public.listings;
CREATE POLICY "Admins view all listings" ON public.listings FOR SELECT TO authenticated USING (app_private.has_role(auth.uid(), 'admin'));

-- notifications
DROP POLICY "Admins insert notifications" ON public.notifications;
CREATE POLICY "Admins insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (app_private.has_role(auth.uid(), 'admin'));

-- offers / orders
DROP POLICY "Admins view all offers" ON public.offers;
CREATE POLICY "Admins view all offers" ON public.offers FOR SELECT TO authenticated USING (app_private.has_role(auth.uid(), 'admin'));
DROP POLICY "Admins view all orders" ON public.orders;
CREATE POLICY "Admins view all orders" ON public.orders FOR SELECT TO authenticated USING (app_private.has_role(auth.uid(), 'admin'));

-- profiles
DROP POLICY "Admins update profiles" ON public.profiles;
CREATE POLICY "Admins update profiles" ON public.profiles FOR UPDATE TO authenticated USING (app_private.has_role(auth.uid(), 'admin')) WITH CHECK (app_private.has_role(auth.uid(), 'admin'));

-- reports
DROP POLICY "Admins update reports" ON public.reports;
CREATE POLICY "Admins update reports" ON public.reports FOR UPDATE TO authenticated USING (app_private.has_role(auth.uid(), 'admin')) WITH CHECK (app_private.has_role(auth.uid(), 'admin'));
DROP POLICY "Reporter or admin views reports" ON public.reports;
CREATE POLICY "Reporter or admin views reports" ON public.reports FOR SELECT TO authenticated USING (auth.uid() = reporter_id OR app_private.has_role(auth.uid(), 'admin'));

-- reviews
DROP POLICY "Admins delete reviews" ON public.reviews;
CREATE POLICY "Admins delete reviews" ON public.reviews FOR DELETE TO authenticated USING (app_private.has_role(auth.uid(), 'admin'));

-- user_roles
DROP POLICY "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (app_private.has_role(auth.uid(), 'admin')) WITH CHECK (app_private.has_role(auth.uid(), 'admin'));

-- verification_requests
DROP POLICY "Admins update verifications" ON public.verification_requests;
CREATE POLICY "Admins update verifications" ON public.verification_requests FOR UPDATE TO authenticated USING (app_private.has_role(auth.uid(), 'admin')) WITH CHECK (app_private.has_role(auth.uid(), 'admin'));
DROP POLICY "Admins view verifications" ON public.verification_requests;
CREATE POLICY "Admins view verifications" ON public.verification_requests FOR SELECT TO authenticated USING (app_private.has_role(auth.uid(), 'admin'));

-- trigger function no longer depends on public.has_role
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

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

-- A2U payout ledger: records app-to-user blockchain transfers for escrow release/refund
CREATE TABLE public.pi_payouts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  escrow_id uuid NOT NULL REFERENCES public.escrows(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('release','refund')),
  amount_pi numeric NOT NULL,
  amount_usd numeric NOT NULL,
  pi_payment_id text UNIQUE,
  pi_tx_id text,
  network text NOT NULL DEFAULT 'mainnet',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','submitted','completed','cancelled','failed')),
  error text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX pi_payouts_escrow_kind_active ON public.pi_payouts (escrow_id, kind) WHERE status <> 'failed' AND status <> 'cancelled';
GRANT SELECT ON public.pi_payouts TO authenticated;
GRANT ALL ON public.pi_payouts TO service_role;
ALTER TABLE public.pi_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants view payouts" ON public.pi_payouts FOR SELECT TO authenticated USING (
  recipient_id = auth.uid()
  OR app_private.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.escrows e WHERE e.id = pi_payouts.escrow_id AND (e.buyer_id = auth.uid() OR e.seller_id = auth.uid()))
);
CREATE TRIGGER pi_payouts_updated_at BEFORE UPDATE ON public.pi_payouts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();