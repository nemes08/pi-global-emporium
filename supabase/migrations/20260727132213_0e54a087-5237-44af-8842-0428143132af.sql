
REVOKE ALL ON FUNCTION public.orders_before_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.orders_before_update() FROM PUBLIC, anon, authenticated;
