
-- Drop the security-definer view
DROP VIEW IF EXISTS public.public_profiles;

-- Create private contact table for profiles
CREATE TABLE public.profile_contacts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_contacts TO authenticated;
GRANT ALL ON public.profile_contacts TO service_role;
ALTER TABLE public.profile_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile contact"
  ON public.profile_contacts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile contact"
  ON public.profile_contacts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile contact"
  ON public.profile_contacts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own profile contact"
  ON public.profile_contacts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_profile_contacts_updated_at
  BEFORE UPDATE ON public.profile_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing contact data
INSERT INTO public.profile_contacts (user_id, phone, email)
SELECT id, phone, email FROM public.profiles
WHERE phone IS NOT NULL OR email IS NOT NULL;

-- Drop sensitive columns from profiles
ALTER TABLE public.profiles DROP COLUMN phone;
ALTER TABLE public.profiles DROP COLUMN email;

-- Restore broad read on profiles (now safe-columns-only)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Profiles readable by all"
  ON public.profiles FOR SELECT
  USING (true);

-- Update handle_new_user to also seed profile_contacts
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profile_contacts (user_id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;
