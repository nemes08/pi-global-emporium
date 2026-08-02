REVOKE ALL ON FUNCTION public.escrows_before_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.escrows_after_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.orders_after_insert_escrow() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.orders_before_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.orders_before_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;