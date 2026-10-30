-- Run against the disposable seeded Supabase database, not the hosted team project.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

insert into auth.users(id) values
  ('30000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000002'),
  ('30000000-0000-0000-0000-000000000003');
insert into public.staff_users(id,role) values
  ('30000000-0000-0000-0000-000000000001','owner'),
  ('30000000-0000-0000-0000-000000000002','staff'),
  ('30000000-0000-0000-0000-000000000003','staff');
select is((select active from public.staff_users where id='30000000-0000-0000-0000-000000000002'), true,
  'New staff accounts are active by default');

insert into public.orders(id,display_order_number,customer_name,customer_email,customer_phone,pickup_at,earliest_pickup_at,
  subtotal_cents,tax_rate,tax_cents,total_cents) values
  ('40000000-0000-0000-0000-000000000001','SCRUM65-1','Test','secret@example.invalid','7135550100',
   now()+interval '1 hour',now()+interval '15 minutes',150,0.0825,12,162);
update public.orders set payment_status='paid',ticket_status='received' where display_order_number='SCRUM65-1';

-- Staff: kitchen work still works, contact details do not.
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000002',true);
set local role authenticated;
select throws_ok($$select customer_email from public.orders$$,'42501',null,'Staff cannot read customer email');
select throws_ok($$select customer_phone from public.orders$$,'42501',null,'Staff cannot read customer phone');
select throws_ok($$select * from public.orders$$,'42501',null,'Staff cannot select every column');
select is((select customer_name from public.orders where display_order_number='SCRUM65-1'),'Test','Staff still read the customer name');
select is((select total_cents from public.orders where display_order_number='SCRUM65-1'),162,'Staff still read order totals');
select lives_ok($$update public.orders set ticket_status='in_progress' where display_order_number='SCRUM65-1'$$,
  'Staff can still advance a ticket');
select throws_ok($$update public.staff_users set active=false where id='30000000-0000-0000-0000-000000000002'$$,
  '42501',null,'Staff cannot edit their own account');
reset role;

-- Owner sessions share the same grant: contact details come from server routes, not direct reads.
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000001',true);
set local role authenticated;
select throws_ok($$select customer_email from public.orders$$,'42501',null,'Owner session cannot read customer email directly');
select is((select ticket_status from public.orders where display_order_number='SCRUM65-1'),'in_progress','Owner still reads ticket status');
select lives_ok($$update public.settings set regular_lead_minutes=regular_lead_minutes where id=1$$,'Owner still edits settings');
reset role;

-- A deactivated owner loses the owner-only permissions too, not just order reads.
update public.staff_users set active=false where id='30000000-0000-0000-0000-000000000001';
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000001',true);
set local role authenticated;
select throws_ok($$insert into public.menu_categories(name) values ('Inactive owner category')$$,
  '42501',null,'Deactivated owner cannot edit the menu');
select is((select count(*)::integer from public.orders),0,'Deactivated owner sees no orders');
reset role;
update public.staff_users set active=true where id='30000000-0000-0000-0000-000000000001';

-- Deactivated account: no role, so no orders and no changes, but it can still read its own row to be signed out.
update public.staff_users set active=false where id='30000000-0000-0000-0000-000000000003';
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000003',true);
set local role authenticated;
select is((select count(*)::integer from public.orders),0,'Deactivated staff see no orders');
select lives_ok($$update public.orders set ticket_status='ready' where display_order_number='SCRUM65-1'$$,
  'Deactivated staff update runs but matches no rows');
select is((select active from public.staff_users where id='30000000-0000-0000-0000-000000000003'),false,
  'Deactivated staff can still read their own row');
select throws_ok($$update public.staff_users set active=true where id='30000000-0000-0000-0000-000000000003'$$,
  '42501',null,'Deactivated staff cannot reactivate themselves');
reset role;
select is((select ticket_status from public.orders where display_order_number='SCRUM65-1'),'in_progress',
  'Deactivated staff changed nothing');

-- Switching the account back on restores access.
update public.staff_users set active=true where id='30000000-0000-0000-0000-000000000003';
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000003',true);
set local role authenticated;
select is((select count(*)::integer from public.orders),1,'Reactivated staff see orders again');
reset role;

select * from finish();
rollback;
