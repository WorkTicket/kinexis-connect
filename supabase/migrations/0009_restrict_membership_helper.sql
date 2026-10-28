-- Supabase can retain an explicit function grant for the anon role even after
-- PUBLIC privileges are revoked. Membership checks are only needed by signed-in
-- users and service-role operations, so fail closed for anonymous callers.
revoke execute on function public.has_business_role(uuid, text[]) from anon;
