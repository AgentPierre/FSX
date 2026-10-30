-- Run against the disposable seeded Supabase database, not the hosted team project.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

insert into auth.users(id) values
  ('50000000-0000-0000-0000-000000000001'),
  ('50000000-0000-0000-0000-000000000002'),
  ('50000000-0000-0000-0000-000000000003');
insert into public.staff_users(id,role) values
  ('50000000-0000-0000-0000-000000000001','owner'),
  ('50000000-0000-0000-0000-000000000002','staff'),
  ('50000000-0000-0000-0000-000000000003','staff');

-- Staff can mark an item sold out and available again.
select set_config('request.jwt.claim.sub','50000000-0000-0000-0000-000000000002',true);
set local role authenticated;
select lives_ok($$update public.menu_items set is_available=false where code='A2'$$,'Staff mark an item sold out');
reset role;
select is((select is_available from public.menu_items where code='A2'),false,'The item is now sold out');
set local role authenticated;
select lives_ok($$update public.menu_items set is_available=true where code='A2'$$,'Staff mark it available again');
reset role;
select is((select is_available from public.menu_items where code='A2'),true,'The item is available again');

-- Nothing else about a menu item is staff-editable, alone or together with the sold-out flag.
set local role authenticated;
select throws_ok($$update public.menu_items set name='Staff rename' where code='A2'$$,'42501',null,'Staff cannot rename an item');
select throws_ok($$update public.menu_items set description='Staff text' where code='A2'$$,'42501',null,'Staff cannot change a description');
select throws_ok($$update public.menu_items set is_active=false where code='A2'$$,'42501',null,'Staff cannot archive an item');
select throws_ok($$update public.menu_items set sort_order=99 where code='A2'$$,'42501',null,'Staff cannot reorder an item');
select throws_ok($$update public.menu_items set is_available=false,name='Staff rename' where code='A2'$$,'42501',null,
  'Staff cannot sneak an edit in next to the sold-out flag');
select throws_ok($$insert into public.menu_items(category_id,code,name) select id,'ZZ1','Staff item' from public.menu_categories limit 1$$,
  '42501',null,'Staff cannot create items');
select lives_ok($$update public.item_sizes set price_cents=1 where menu_item_id=(select id from public.menu_items where code='A2')$$,
  'A staff price update runs but matches no rows');
select lives_ok($$update public.settings set regular_lead_minutes=1 where id=1$$,'A staff settings update runs but matches no rows');
reset role;
select is((select name from public.menu_items where code='A2'),'Egg Roll','The item name is unchanged');
select is((select price_cents from public.item_sizes where menu_item_id=(select id from public.menu_items where code='A2')),150,
  'The price is unchanged');
select is((select regular_lead_minutes from public.settings where id=1),15,'Settings are unchanged');

-- Guests cannot touch the menu at all.
set local role anon;
select throws_ok($$update public.menu_items set is_available=false where code='A2'$$,'42501',null,'Guests cannot mark items sold out');
reset role;

-- The owner keeps full control, including the sold-out flag.
select set_config('request.jwt.claim.sub','50000000-0000-0000-0000-000000000001',true);
set local role authenticated;
select lives_ok($$update public.menu_items set name='Owner rename',is_available=false where code='A2'$$,'Owner edits name and sold-out flag together');
reset role;
select is((select name from public.menu_items where code='A2'),'Owner rename','The owner rename took effect');

-- A deactivated staff member has no role, so cannot change sold-out either.
update public.staff_users set active=false where id='50000000-0000-0000-0000-000000000003';
select set_config('request.jwt.claim.sub','50000000-0000-0000-0000-000000000003',true);
set local role authenticated;
select lives_ok($$update public.menu_items set is_available=true where code='A2'$$,'A deactivated staff update runs but matches no rows');
reset role;
select is((select is_available from public.menu_items where code='A2'),false,'A deactivated staff member changed nothing');

select * from finish();
rollback;
