-- Run against the disposable seeded Supabase database, not the hosted team project.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

select is((select count(*)::integer from public.menu_items), 46, '46 CSV items');
select is((select count(*)::integer from public.item_sizes), 58, '58 priced sizes');
select is((select count(*)::integer from public.menu_categories), 7, 'Seven CSV categories');
select is((select count(*)::integer from public.menu_items where code in ('G7','G8')), 0, 'No invented G7/G8');
select is((select price_cents from public.item_sizes s join public.menu_items m on m.id=s.menu_item_id
  where m.code='G1' and s.size_code='regular'), 1299, 'G1 uses its full plate price');
select is((select price_cents from public.item_sizes s join public.menu_items m on m.id=s.menu_item_id
  where m.code='R1' and s.size_code='lg'), 1190, 'Rice large price from CSV');
select is((select count(*)::integer from public.item_sizes s join public.menu_items m on m.id=s.menu_item_id
  where m.is_catering and ((s.size_code='S' and s.price_cents=3999)
    or (s.size_code='M' and s.price_cents=5999) or (s.size_code='L' and s.price_cents=7999))), 9, 'All tray sizes/prices');
select is((select tax_rate from public.settings where id=1), 0.082500::numeric, 'Tax fraction');
select is((select count(*)::integer from public.business_hours), 7, 'Weekly hours seeded');
select ok((select opens_at is null and closes_at is null from public.business_hours where day_of_week=0), 'Sunday closed');
select is((select count(*)::integer from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind='r' and c.relrowsecurity
    and c.relname in ('staff_users','menu_categories','menu_items','item_sizes','price_change_log','orders',
      'order_lines','order_line_components','payments','order_status_log','business_hours','settings')), 12, 'RLS enabled on all 12 tables');
select throws_ok($$update public.item_sizes set price_cents=0$$, '23514', null, 'Zero price rejected');
select throws_ok($$update public.item_sizes set price_cents=-1$$, '23514', null, 'Negative price rejected');

-- Only test identities; the seed never creates staff accounts.
insert into auth.users(id) values
  ('10000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000003');
insert into public.staff_users(id,role) values
  ('10000000-0000-0000-0000-000000000001','owner'),
  ('10000000-0000-0000-0000-000000000002','staff');
insert into public.orders(id,display_order_number,customer_name,customer_email,pickup_at,earliest_pickup_at,
  subtotal_cents,tax_rate,tax_cents,total_cents) values
  ('20000000-0000-0000-0000-000000000001','TEST-1','Test','test@example.invalid',now()+interval '1 hour',now()+interval '15 minutes',150,0.0825,12,162),
  ('20000000-0000-0000-0000-000000000002','TEST-2','Test','test@example.invalid',now()+interval '1 hour',now()+interval '15 minutes',150,0.0825,12,162);
insert into public.order_lines(order_id,item_size_id,quantity,unit_price_cents,item_name_snapshot,size_code_snapshot,instructions)
  select '20000000-0000-0000-0000-000000000001',s.id,1,150,m.name,'regular','Keep instructions'
  from public.item_sizes s join public.menu_items m on m.id=s.menu_item_id where m.code='A2';
select throws_ok($$update public.order_lines set unit_price_cents=0$$, '23514', null, 'Zero snapshot price rejected');
select throws_ok($$update public.orders set payment_status='refunded' where display_order_number='TEST-1'$$, '23514', null, 'No refunded payment value');
select throws_ok($$update public.orders set payment_status='cancelled' where display_order_number='TEST-1'$$, '23514', null, 'No cancelled payment value');
select throws_ok($$update public.orders set ticket_status='received' where display_order_number='TEST-1'$$, '23514', null, 'Unpaid ticket rejected');
select lives_ok($$update public.orders set payment_status='paid',ticket_status='received' where display_order_number='TEST-1'$$, 'Webhook confirmation can open ticket');
select lives_ok($$update public.orders set payment_status='expired' where display_order_number='TEST-2'$$, 'Abandoned checkout expires');
select throws_ok($$update public.orders set ticket_status='received' where display_order_number='TEST-2'$$, '23514', null, 'Expired checkout cannot open ticket');
insert into public.payments(order_id,stripe_checkout_session_id,amount_cents)
  values ('20000000-0000-0000-0000-000000000001','cs_test_one',162);
select throws_ok($$insert into public.payments(order_id,stripe_checkout_session_id,amount_cents)
  values ('20000000-0000-0000-0000-000000000001','cs_test_two',162)$$, '23505', null, 'One session per order');
select throws_ok($$insert into public.payments(order_id,stripe_checkout_session_id,amount_cents)
  values ('20000000-0000-0000-0000-000000000002','cs_test_one',162)$$, '23505', null, 'Session cannot belong to a second order');

-- Simulate the role and JWT claims PostgREST supplies; never use editable user_metadata.
set local role anon;
select is((select count(*)::integer from public.menu_items),46,'Guest reads active menu');
select throws_ok($$select * from public.orders$$, '42501', null, 'Guest cannot read customer data');
select throws_ok($$insert into public.menu_categories(name) values ('Anonymous')$$, '42501', null, 'Guest cannot write menu');
select throws_ok($$select * from public.staff_users$$, '42501', null, 'Guest cannot read role data');
reset role;

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
set local role authenticated;
select is((select count(*)::integer from public.orders),0,'Login without team role cannot read orders');
select throws_ok($$insert into public.staff_users(id,role) values ('10000000-0000-0000-0000-000000000003','owner')$$,
  '42501',null,'User cannot promote themselves');
reset role;

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
set local role authenticated;
select is((select count(*)::integer from public.orders),2,'Staff reads order history');
select is((select count(*)::integer from public.order_lines),1,'Staff reads lines');
select is((select count(*)::integer from public.payments),0,'Stripe references restricted to owner');
select throws_ok($$update public.orders set payment_status='paid' where display_order_number='TEST-2'$$,
  '42501',null,'Staff cannot change payment');
select throws_ok($$update public.orders set total_cents=1 where display_order_number='TEST-1'$$,
  '42501',null,'Staff cannot change money');
select throws_ok($$update public.orders set ticket_status='cancelled' where display_order_number='TEST-1'$$,
  '42501',null,'Staff cannot cancel tickets');
select lives_ok($$update public.orders set ticket_status='in_progress' where display_order_number='TEST-1'$$,
  'Staff advances received ticket');
select throws_ok($$update public.orders set ticket_status='completed' where display_order_number='TEST-1'$$,
  '23514',null,'Staff cannot skip ready');
select throws_ok($$insert into public.menu_categories(name) values ('Staff menu')$$,
  '42501',null,'Staff cannot add menu categories');
select throws_ok($$insert into public.order_status_log(order_id,status_kind,to_status)
  values ('20000000-0000-0000-0000-000000000001','ticket','ready')$$,'42501',null,'Staff cannot forge audit log');
reset role;

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
set local role authenticated;
select lives_ok($$update public.orders set ticket_status='cancelled' where display_order_number='TEST-1'$$,
  'Owner cancels paid ticket');
select is((select count(*)::integer from public.payments),1,'Owner reads payment reference');
select lives_ok($$update public.item_sizes set price_cents=151 where menu_item_id=(select id from public.menu_items where code='A2')$$,
  'Owner changes size price');
select is((select count(*)::integer from public.price_change_log where changed_by=auth.uid()),1,'Price change audited with owner');
select is((select unit_price_cents from public.order_lines limit 1),150,'Price edit preserves old order price');
select lives_ok($$update public.menu_items set name='Renamed egg roll',is_available=false where code='A2'$$,
  'Owner changes menu and availability');
select is((select item_name_snapshot from public.order_lines limit 1),'Egg Roll','Rename preserves old order name');
select lives_ok($$update public.settings set regular_lead_minutes=16 where id=1$$,'Owner changes settings');
select throws_ok($$delete from public.menu_items where code='A2'$$,'42501',null,'Menu is archived rather than deleted');
reset role;

set local role anon;
select is((select count(*)::integer from public.menu_items),46,'Sold-out item remains visible to guest');
select is((select count(*)::integer from public.item_sizes),58,'Sold-out item sizes remain visible to guest');
select ok((select not is_available from public.menu_items where code='A2'),'Guest can read sold-out flag to disable cart');
reset role;

-- Archival differs from temporary unavailability: archived items and sizes stay hidden.
update public.menu_items set is_active=false where code='A2';
set local role anon;
select is((select count(*)::integer from public.menu_items),45,'Guest cannot see archived item');
select is((select count(*)::integer from public.item_sizes),57,'Guest cannot see archived item sizes');
reset role;

select is((select count(*)::integer from public.order_status_log where status_kind='ticket'
  and to_status='cancelled' and changed_by='10000000-0000-0000-0000-000000000001'),1,'Cancellation actor logged');
select is((select count(*)::integer from public.order_status_log where status_kind='payment' and to_status='paid'),1,'Payment transition logged once');
update public.orders set payment_status='paid',ticket_status='cancelled' where display_order_number='TEST-1';
select is((select count(*)::integer from public.order_status_log where status_kind='payment' and to_status='paid'),1,'Repeat confirmation adds no duplicate payment log');
select ok((select customer_phone is null from public.orders where display_order_number='TEST-1'),'Phone optional');
select is((select instructions from public.order_lines limit 1),'Keep instructions','Instructions retained');
select * from finish();
rollback;
