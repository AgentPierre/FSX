-- SCRUM-65 (Charles's authentication and role-based access design), two changes agreed in review:
-- 1. Staff and owner sessions can no longer read orders.customer_email or orders.customer_phone directly.
--    Row-level security filters rows, not columns, so this needs column grants. Contact details are still
--    read by server routes that use the service role (lib/data/supabase.ts), which these grants do not touch.
-- 2. staff_users gets an active flag, so an account can be switched off without deleting the row
--    (audit-log entries keep pointing at it). An inactive account has no role as far as the database is concerned.
begin;

alter table public.staff_users add column active boolean not null default true;

-- Same lookup as before, but only for active accounts. Every policy and trigger that calls app_role()
-- (orders, menu, settings, cancel-ticket rule) therefore refuses an inactive account without further changes.
create or replace function private.app_role() returns text
language sql stable security invoker set search_path = ''
as $$ select role from public.staff_users where id = (select auth.uid()) and active $$;

-- Table-wide select is replaced by a column list without the two contact columns. Update stays limited to
-- ticket_status (granted in the T23 migration), and the RLS policies on rows are unchanged.
-- Watch out: a column added to orders later is NOT readable by staff or owner sessions until it is added to
-- this list in a new migration, and select('*') or a read of the two contact columns through a signed-in
-- session now fails with a permission error. Read those through a server route with the service role instead.
revoke select on public.orders from authenticated;
grant select (
  id, display_order_number, customer_name, pickup_at, earliest_pickup_at,
  payment_status, ticket_status, subtotal_cents, tax_rate, tax_cents, total_cents,
  email_sent_at, created_at, updated_at
) on public.orders to authenticated;

commit;
