
-- 1) listing_contacts: private owner-only table
CREATE TABLE public.listing_contacts (
  listing_id uuid PRIMARY KEY REFERENCES public.listings(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL,
  seller_phone text,
  seller_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_contacts TO authenticated;
GRANT ALL ON public.listing_contacts TO service_role;
ALTER TABLE public.listing_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages own listing contacts"
  ON public.listing_contacts
  FOR ALL TO authenticated
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

CREATE TRIGGER update_listing_contacts_updated_at
  BEFORE UPDATE ON public.listing_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing contact data
INSERT INTO public.listing_contacts (listing_id, seller_id, seller_phone, seller_email)
SELECT id, seller_id, seller_phone, seller_email
FROM public.listings
WHERE seller_phone IS NOT NULL OR seller_email IS NOT NULL;

-- Drop contact columns from listings
ALTER TABLE public.listings DROP COLUMN seller_phone;
ALTER TABLE public.listings DROP COLUMN seller_email;

-- 2) profiles: restrict to owner-only reads, expose safe cols via view
DROP POLICY "Authenticated users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Public-safe view (security_invoker so RLS applies to base table? No -
-- we need everyone to see safe columns. Use security_definer default
-- so view exposes only non-sensitive fields; underlying table stays locked.)
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = false) AS
SELECT id, full_name, username, avatar_url, verified, country, city, biography, join_date, created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;
