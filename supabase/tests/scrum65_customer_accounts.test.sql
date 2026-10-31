-- Run against the disposable seeded Supabase database, not the hosted team project.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

-- 1 owner, 2 staff, 3 and 4 customers (no staff_users row).
insert into auth.users(id) values
  ('60000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-000000000002'),
  ('60000000-0000-0000-0000-000000000003'),
  ('60000000-0000-0000-0000-000000000004');
insert into public.staff_users(id,role) values
  ('60000000-0000-0000-0000-000000000001','owner'),
  ('60000000-0000-0000-0000-000000000002','staff');

-- One order for customer 3, one for customer 4, one guest order.
insert into public.orders(id,display_order_number,customer_name,customer_email,pickup_at,earliest_pickup_at,
  subtotal_cents,tax_rate,tax_cents,total_cents,customer_user_id) values
  ('70000000-0000-0000-0000-000000000001','ACCT-1','Customer Three','three@example.invalid',now()+interval '1 hour',
   now()+interval '15 minutes',150,0.0825,12,162,'60000000-0000-0000-0000-000000000003'),
  ('70000000-0000-0000-0000-000000000002','ACCT-2','Customer Four','four@example.invalid',now()+interval '1 hour',
   now()+interval '15 minutes',150,0.0825,12,162,'60000000-0000-0000-0000-000000000004'),
  ('70000000-0000-0000-0000-000000000003','ACCT-3','Guest','guest@example.invalid',now()+interval '1 hour',
   now()+interval '15 minutes',150,0.0825,12,162,null);
insert into public.order_lines(order_id,item_size_id,quantity,unit_price_cents,item_name_snapshot,size_code_snapshot)
  select '70000000-0000-0000-0000-000000000001',s.id,1,150,m.name,'regular'
  from public.item_sizes s join public.menu_items m on m.id=s.menu_item_id where m.code='A2';
insert into public.order_line_components(order_line_id,component_position,menu_item_id,item_name_snapshot)
  select l.id,1,m.id,m.name from public.order_lines l, public.menu_items m
  where l.order_id='70000000-0000-0000-0000-000000000001' and m.code='G2';
insert into public.payments(order_id,stripe_checkout_session_id,amount_cents)
  values ('70000000-0000-0000-0000-000000000001','cs_test_accounts',162);
update public.item_sizes set price_cents=price_cents+1
  where menu_item_id=(select id from public.menu_items where code='A2');

-- Every table has rows, so the zero counts below mean something.
select cmp_ok((select count(*)::integer from public.orders),'>=',3,'Orders exist');
select cmp_ok((select count(*)::integer from public.order_lines),'>',0,'Order lines exist');
select cmp_ok((select count(*)::integer from public.order_line_components),'>',0,'Order components exist');
select cmp_ok((select count(*)::integer from public.payments),'>',0,'Payments exist');
select cmp_ok((select count(*)::integer from public.order_status_log),'>',0,'Status log rows exist');
select cmp_ok((select count(*)::integer from public.price_change_log),'>',0,'Price log rows exist');
select has_index('public','orders','orders_customer_user_id_idx','Order lookups by account are indexed');

-- A signed-in customer reads nothing private, including their own order: the server route reads it for them.
select set_config('request.jwt.claim.sub','60000000-0000-0000-0000-000000000003',true);
set local role authenticated;
select is((select count(*)::integer from public.orders),0,'A customer reads no orders, not even their own');
select is((select count(*)::integer from public.order_lines),0,'A customer reads no order lines');
select is((select count(*)::integer from public.order_line_components),0,'A customer reads no order components');
select is((select count(*)::integer from public.payments),0,'A customer reads no payments');
select is((select count(*)::integer from public.order_status_log),0,'A customer reads no status log');
select is((select count(*)::integer from public.price_change_log),0,'A customer reads no price log');
select is((select count(*)::integer from public.staff_users),0,'A customer reads no staff accounts');
select throws_ok($$select customer_user_id from public.orders$$,'42501',null,'A customer cannot read the account link column');
select throws_ok($$select customer_email from public.orders$$,'42501',null,'A customer cannot read contact details');

-- Customers cannot write anything either.
select throws_ok($$update public.orders set customer_user_id='60000000-0000-0000-0000-000000000003'
  where display_order_number='ACCT-2'$$,'42501',null,'A customer cannot claim another order');
select throws_ok($$update public.orders set customer_name='Changed'$$,'42501',null,'A customer cannot edit order details');
select lives_ok($$update public.orders set ticket_status='ready'$$,'A customer ticket update runs but matches no rows');
select lives_ok($$update public.menu_items set name='Customer rename' where code='A2'$$,'A customer menu update runs but matches no rows');
select lives_ok($$update public.item_sizes set price_cents=1$$,'A customer price update runs but matches no rows');
select lives_ok($$update public.settings set regular_lead_minutes=1 where id=1$$,'A customer settings update runs but matches no rows');
select throws_ok($$insert into public.staff_users(id,role) values ('60000000-0000-0000-0000-000000000003','owner')$$,
  '42501',null,'A customer cannot give themselves a staff role');
select throws_ok($$insert into public.menu_categories(name) values ('Customer category')$$,'42501',null,
  'A customer cannot create menu categories');

-- A customer still reads the public menu, hours and settings, like a guest.
select cmp_ok((select count(*)::integer from public.menu_items),'>',0,'A customer reads the public menu');
select cmp_ok((select count(*)::integer from public.item_sizes),'>',0,'A customer reads public sizes');
select cmp_ok((select count(*)::integer from public.business_hours),'>',0,'A customer reads business hours');
select is((select count(*)::integer from public.settings),1,'A customer reads public settings');
reset role;

select is((select name from public.menu_items where code='A2'),'Egg Roll','The menu item is unchanged');
select is((select count(*)::integer from public.orders where customer_user_id='60000000-0000-0000-0000-000000000004'),1,
  'The other customer order is still linked to its own account');

-- Staff and owner sessions cannot read the account link either.
select set_config('request.jwt.claim.sub','60000000-0000-0000-0000-000000000002',true);
set local role authenticated;
select throws_ok($$select customer_user_id from public.orders$$,'42501',null,'Staff cannot read the account link column');
select throws_ok($$select * from public.orders$$,'42501',null,'Staff cannot select every order column');
select throws_ok($$update public.orders set customer_user_id=null$$,'42501',null,'Staff cannot change the account link');
reset role;
select set_config('request.jwt.claim.sub','60000000-0000-0000-0000-000000000001',true);
set local role authenticated;
select throws_ok($$select customer_user_id from public.orders$$,'42501',null,'Owner session cannot read the account link column');
select throws_ok($$update public.orders set customer_user_id=null$$,'42501',null,'Owner session cannot change the account link');
reset role;

-- The server (service role) stamps and reads the link.
set local role service_role;
select lives_ok($$update public.orders set customer_user_id='60000000-0000-0000-0000-000000000003'
  where display_order_number='ACCT-3'$$,'The server can stamp a guest order with an account');
select is((select count(*)::integer from public.orders where customer_user_id='60000000-0000-0000-0000-000000000003'),2,
  'The server finds the orders of one account');
reset role;

-- Deleting an account keeps its orders as guest orders.
delete from auth.users where id='60000000-0000-0000-0000-000000000003';
select is((select count(*)::integer from public.orders where display_order_number in ('ACCT-1','ACCT-3')),2,
  'Deleting an account keeps its orders');
select ok((select bool_and(customer_user_id is null) from public.orders where display_order_number in ('ACCT-1','ACCT-3')),
  'Those orders become guest orders');

select * from finish();
rollback;
