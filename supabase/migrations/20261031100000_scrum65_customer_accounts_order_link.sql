-- SCRUM-65 / owner decision 30 Oct 2026: customer accounts, smallest version (sign up, sign in, see past orders).
-- An order placed while signed in is stamped with the account id. Guest checkout is unchanged: the column stays null.
--
-- on delete set null, not restrict: deleting a customer account must not delete orders (BR-24 keeps them at
-- least 6 months). The order simply becomes a guest order.
--
-- No policy and no grant is added, on purpose:
--  * A customer is a normal Supabase Auth user with no staff_users row, so private.app_role() is null for them
--    and every existing policy gives them nothing beyond what a guest can already read.
--  * "authenticated" reads orders through a column list (SCRUM-65 contact-columns migration). This column is
--    not on that list, so staff and owner sessions cannot read it either. Server routes read and write it
--    with the service-role key.
-- create_checkout_order is NOT changed (it is on the payment path): the server stamps the order in a separate
-- update after it is created, and a failed stamp leaves an ordinary guest order.
begin;

alter table public.orders
  add column customer_user_id uuid references auth.users(id) on delete set null;
create index orders_customer_user_id_idx on public.orders(customer_user_id, created_at)
  where customer_user_id is not null;

commit;
