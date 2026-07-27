
ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_seller_id_fkey;
ALTER TABLE public.listing_media DROP CONSTRAINT IF EXISTS listing_media_seller_id_fkey;
ALTER TABLE public.listing_contacts DROP CONSTRAINT IF EXISTS listing_contacts_seller_id_fkey;
ALTER TABLE public.favorites DROP CONSTRAINT IF EXISTS favorites_user_id_fkey;
ALTER TABLE public.recently_viewed DROP CONSTRAINT IF EXISTS recently_viewed_user_id_fkey;
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_buyer_id_fkey;
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_seller_id_fkey;
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_buyer_id_fkey;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_seller_id_fkey;
ALTER TABLE public.offers DROP CONSTRAINT IF EXISTS offers_buyer_id_fkey;
ALTER TABLE public.offers DROP CONSTRAINT IF EXISTS offers_seller_id_fkey;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE public.profile_contacts DROP CONSTRAINT IF EXISTS profile_contacts_user_id_fkey;
ALTER TABLE public.verification_requests DROP CONSTRAINT IF EXISTS verification_requests_user_id_fkey;
