-- T25 / SCRUM-64: atomic operations used only by the trusted server data store.
begin;

create sequence private.order_number_sequence;
revoke all on sequence private.order_number_sequence from public, anon, authenticated;
grant usage on sequence private.order_number_sequence to service_role;

create function public.create_checkout_order(p_order jsonb, p_earliest_pickup_at timestamptz)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  order_id uuid := gen_random_uuid();
  order_number text;
  line jsonb;
  component text;
  position integer;
  line_id uuid;
  item record;
  half_item record;
  config public.settings%rowtype;
  subtotal bigint := 0;
  tax bigint;
begin
  if jsonb_typeof(p_order->'lines') is distinct from 'array'
    or jsonb_array_length(p_order->'lines') not between 1 and 30 then
    raise exception 'An order requires 1 to 30 lines' using errcode = '23514';
  end if;
  select * into strict config from public.settings where id=1 for share;
  if p_order->>'paymentStatus' <> 'pending_payment'
    or p_order->>'ticketStatus' is not null then
    raise exception 'Order must start unpaid' using errcode = '23514';
  end if;
  -- Keep the existing stub's running-number presentation. Hiab can confirm the final display format.
  order_number := nextval('private.order_number_sequence')::text;
  order_number := repeat('0', greatest(0,4-length(order_number))) || order_number;
  insert into public.orders(id,display_order_number,customer_name,customer_email,customer_phone,
    pickup_at,earliest_pickup_at,subtotal_cents,tax_rate,tax_cents,total_cents)
  values(order_id,order_number,p_order->>'customerName',p_order->>'customerEmail',
    nullif(p_order->>'customerPhone',''),(p_order->>'pickupTime')::timestamptz,p_earliest_pickup_at,
    (p_order->>'subtotalCents')::integer,config.tax_rate,(p_order->>'taxCents')::integer,
    (p_order->>'totalCents')::integer);

  for line in select value from jsonb_array_elements(p_order->'lines') loop
    select s.id,s.size_code,s.price_cents,m.id as menu_item_id,m.code,m.name,m.is_active,m.is_available
      into strict item from public.item_sizes s join public.menu_items m on m.id=s.menu_item_id
      where s.id=(line->>'sizeId')::uuid for share of s,m;
    if not item.is_active or not item.is_available then
      raise exception 'Item unavailable' using errcode = '23514';
    end if;
    if (line->>'unitPriceCents')::integer is distinct from item.price_cents
      or line->>'nameSnapshot' is distinct from item.name then
      raise exception 'Menu changed; refresh checkout' using errcode = '23514';
    end if;
    if (line->>'quantity')::integer not between 1 and 50 then
      raise exception 'Invalid quantity' using errcode = '23514';
    end if;
    subtotal := subtotal + item.price_cents::bigint * (line->>'quantity')::integer;
    insert into public.order_lines(order_id,item_size_id,quantity,unit_price_cents,item_name_snapshot,
      size_code_snapshot,spicy_requested,instructions)
    values(order_id,item.id,(line->>'quantity')::integer,item.price_cents,item.name,item.size_code,
      coalesce((line->>'spicy')::boolean,false),nullif(line->>'instructions','')) returning id into line_id;
    if jsonb_typeof(line->'components') is distinct from 'array' then
      raise exception 'Invalid components' using errcode = '23514';
    end if;
    if (item.code='G1' and jsonb_array_length(line->'components')<>2)
      or (item.code<>'G1' and jsonb_array_length(line->'components')<>0) then
      raise exception 'Invalid combo selection count' using errcode = '23514';
    end if;
    position := 0;
    for component in select jsonb_array_elements_text(line->'components') loop
      position := position+1;
      if component not in ('G2','G3','G4','G5','G6','G9','G10') then
        raise exception 'Invalid combo selection' using errcode = '23514';
      end if;
      select id,name,is_active,is_available into strict half_item from public.menu_items
        where code=component for share;
      if not half_item.is_active or not half_item.is_available then
        raise exception 'Combo item unavailable' using errcode = '23514';
      end if;
      insert into public.order_line_components(order_line_id,component_position,menu_item_id,item_name_snapshot)
        values(line_id,position,half_item.id,half_item.name);
    end loop;
  end loop;
  tax := round(subtotal * config.tax_rate);
  if subtotal <> (p_order->>'subtotalCents')::bigint
    or tax <> (p_order->>'taxCents')::bigint
    or subtotal+tax <> (p_order->>'totalCents')::bigint
    or round(config.tax_rate*10000) <> (p_order->>'taxRateBps')::integer then
    raise exception 'Checkout totals changed; refresh checkout' using errcode = '23514';
  end if;
  return order_id;
end;
$$;
revoke all on function public.create_checkout_order(jsonb,timestamptz) from public, anon, authenticated;
grant execute on function public.create_checkout_order(jsonb,timestamptz) to service_role;

create function public.attach_checkout_session(p_order_id uuid,p_session_id text)
returns void language plpgsql security invoker set search_path = '' as $$
declare current_order public.orders%rowtype; existing_session text;
begin
  select * into strict current_order from public.orders where id=p_order_id for update;
  if current_order.payment_status<>'pending_payment' then
    raise exception 'Order is not pending' using errcode = '23514';
  end if;
  select stripe_checkout_session_id into existing_session from public.payments where order_id=p_order_id;
  if existing_session is not null then
    if existing_session<>p_session_id then
      raise exception 'Order already has a different session' using errcode = '23505';
    end if;
    return;
  end if;
  insert into public.payments(order_id,stripe_checkout_session_id,amount_cents,currency)
    values(p_order_id,p_session_id,current_order.total_cents,'usd');
end;
$$;
revoke all on function public.attach_checkout_session(uuid,text) from public, anon, authenticated;
grant execute on function public.attach_checkout_session(uuid,text) to service_role;

create function public.confirm_checkout_payment(p_order_id uuid,p_session_id text)
returns text language plpgsql security invoker set search_path = '' as $$
declare current_order public.orders%rowtype; payment public.payments%rowtype;
begin
  -- All session/payment operations acquire the order lock first to serialize retries.
  select * into current_order from public.orders where id=p_order_id for update;
  if not found then return 'not_found'; end if;
  select * into payment from public.payments where order_id=p_order_id for update;
  if not found or payment.stripe_checkout_session_id<>p_session_id then return 'session_mismatch'; end if;
  if current_order.payment_status='paid' then return 'already_paid'; end if;
  if current_order.payment_status<>'pending_payment' then return 'not_pending'; end if;
  if payment.amount_cents<>current_order.total_cents or payment.currency<>'usd' then
    raise exception 'Payment amount or currency mismatch' using errcode = '23514';
  end if;
  update public.payments set paid_at=now() where id=payment.id;
  update public.orders set payment_status='paid',ticket_status='received' where id=p_order_id;
  return 'paid';
end;
$$;
revoke all on function public.confirm_checkout_payment(uuid,text) from public, anon, authenticated;
grant execute on function public.confirm_checkout_payment(uuid,text) to service_role;

commit;
