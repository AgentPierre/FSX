begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

select ok(not has_function_privilege('anon','public.create_checkout_order(jsonb,timestamptz)','execute'),'Guest cannot call checkout RPC');
select ok(not has_function_privilege('authenticated','public.confirm_checkout_payment(uuid,text)','execute'),'Staff login cannot confirm payment');
select ok(not has_function_privilege('authenticated','public.attach_checkout_session(uuid,text)','execute'),'Staff login cannot attach Stripe sessions');
select set_config('test.order_payload',jsonb_build_object(
  'customerName','Connection Test','customerEmail','connection@example.invalid','customerPhone',null,
  'pickupTime',now()+interval '2 hours','paymentStatus','pending_payment','ticketStatus',null,
  'subtotalCents',150,'taxCents',12,'totalCents',162,'taxRateBps',825,
  'lines',jsonb_build_array(jsonb_build_object(
    'sizeId',(select s.id from public.item_sizes s join public.menu_items m on m.id=s.menu_item_id where m.code='A2'),
    'quantity',1,'unitPriceCents',150,'nameSnapshot','Egg Roll','spicy',false,'instructions','No onions',
    'components',jsonb_build_array()))
)::text,true);

set local role service_role;
select set_config('test.order_id',public.create_checkout_order(current_setting('test.order_payload')::jsonb,now()+interval '15 minutes')::text,true);
select is((select count(*)::integer from public.order_lines where order_id=current_setting('test.order_id')::uuid),1,'Order and line created together');
select is((select instructions from public.order_lines where order_id=current_setting('test.order_id')::uuid),'No onions','Instructions stored');
select is((select payment_status from public.orders where id=current_setting('test.order_id')::uuid),'pending_payment','Stored order starts pending');
select ok((select ticket_status is null from public.orders where id=current_setting('test.order_id')::uuid),'Unpaid order has no ticket');
select throws_ok($$select public.create_checkout_order(jsonb_set(current_setting('test.order_payload')::jsonb,'{lines,0,unitPriceCents}','1'::jsonb),now()+interval '15 minutes')$$,
  '23514',null,'Price tampering rejected');
select is((select count(*)::integer from public.orders where customer_email='connection@example.invalid'),1,'Rejected checkout rolled back order and lines');
select throws_ok($$select public.create_checkout_order(jsonb_set(current_setting('test.order_payload')::jsonb,'{taxCents}','0'::jsonb),now()+interval '15 minutes')$$,
  '23514',null,'Wrong tax rejected');
select throws_ok($$select public.create_checkout_order(jsonb_set(current_setting('test.order_payload')::jsonb,'{lines,0,components}','["G2","G5"]'::jsonb),now()+interval '15 minutes')$$,
  '23514',null,'Noncombo cannot accept components');
select lives_ok($$select public.attach_checkout_session(current_setting('test.order_id')::uuid,'cs_t25_test')$$,'Attach one session');
select lives_ok($$select public.attach_checkout_session(current_setting('test.order_id')::uuid,'cs_t25_test')$$,'Repeated attachment is idempotent');
select throws_ok($$select public.attach_checkout_session(current_setting('test.order_id')::uuid,'cs_t25_different')$$,
  '23505',null,'Cannot replace order session');
select is(public.confirm_checkout_payment(current_setting('test.order_id')::uuid,'cs_wrong'),'session_mismatch','Wrong session cannot pay order');
select is(public.confirm_checkout_payment(current_setting('test.order_id')::uuid,'cs_t25_test'),'paid','Verified server confirmation pays order');
select is(public.confirm_checkout_payment(current_setting('test.order_id')::uuid,'cs_t25_test'),'already_paid','Duplicate webhook is idempotent');
select is((select ticket_status from public.orders where id=current_setting('test.order_id')::uuid),'received','Paid order reaches kitchen');
select ok((select paid_at is not null from public.payments where order_id=current_setting('test.order_id')::uuid),'Payment timestamp committed');
select is((select count(*)::integer from public.order_status_log where order_id=current_setting('test.order_id')::uuid and to_status='paid'),1,'One paid audit event');
select set_config('test.order_id_2',public.create_checkout_order(current_setting('test.order_payload')::jsonb,now()+interval '15 minutes')::text,true);
select isnt((select display_order_number from public.orders where id=current_setting('test.order_id')::uuid),
  (select display_order_number from public.orders where id=current_setting('test.order_id_2')::uuid),'Order references are distinct');
select lives_ok($$select public.attach_checkout_session(current_setting('test.order_id_2')::uuid,'cs_t25_expired')$$,'Attach expiring checkout');
update public.orders set payment_status='expired' where id=current_setting('test.order_id_2')::uuid;
select is(public.confirm_checkout_payment(current_setting('test.order_id_2')::uuid,'cs_t25_expired'),'not_pending','Expired checkout cannot be revived');
reset role;
select * from finish();
rollback;
