-- T23 / SCRUM-62: Charles's final ERD. Apply through Supabase migrations only.
begin;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create table public.staff_users (
  id uuid primary key references auth.users(id) on delete restrict,
  role text not null check (role in ('staff', 'owner'))
);
alter table public.staff_users enable row level security;
revoke all on public.staff_users from public, anon, authenticated;
grant select on public.staff_users to authenticated;
grant all on public.staff_users to service_role;
create policy staff_read_own_role on public.staff_users for select to authenticated
  using (id = (select auth.uid()));

-- Invoker lookup uses the nonrecursive own-role policy above; no editable JWT claims.
create function private.app_role() returns text
language sql stable security invoker set search_path = ''
as $$ select role from public.staff_users where id = (select auth.uid()) $$;
revoke all on function private.app_role() from public, anon;
grant execute on function private.app_role() to authenticated, service_role;

create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (btrim(name) <> ''),
  sort_order integer not null default 0 check (sort_order >= 0)
);
alter table public.menu_categories enable row level security;
revoke all on public.menu_categories from public, anon, authenticated;
grant select on public.menu_categories to anon, authenticated;
grant insert, update on public.menu_categories to authenticated;
grant all on public.menu_categories to service_role;
create policy categories_public_read on public.menu_categories for select to anon, authenticated using (true);
create policy categories_owner_insert on public.menu_categories for insert to authenticated
  with check ((select private.app_role()) = 'owner');
create policy categories_owner_update on public.menu_categories for update to authenticated
  using ((select private.app_role()) = 'owner') with check ((select private.app_role()) = 'owner');

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.menu_categories(id) on delete restrict,
  code text not null unique check (btrim(code) <> ''),
  name text not null check (btrim(name) <> ''),
  description text,
  is_available boolean not null default true,
  is_active boolean not null default true,
  is_spicy_flag boolean not null default false,
  is_catering boolean not null default false,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.menu_items enable row level security;
revoke all on public.menu_items from public, anon, authenticated;
grant select on public.menu_items to anon, authenticated;
grant insert, update on public.menu_items to authenticated;
grant all on public.menu_items to service_role;
create policy items_public_read on public.menu_items for select to anon, authenticated
  using (is_active);
create policy items_team_read on public.menu_items for select to authenticated
  using ((select private.app_role()) in ('staff', 'owner'));
create policy items_owner_insert on public.menu_items for insert to authenticated
  with check ((select private.app_role()) = 'owner');
create policy items_owner_update on public.menu_items for update to authenticated
  using ((select private.app_role()) = 'owner') with check ((select private.app_role()) = 'owner');
create index menu_items_category_id_idx on public.menu_items(category_id);

create table public.item_sizes (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references public.menu_items(id) on delete restrict,
  size_code text not null check (size_code in ('regular', 'sm', 'lg', 'S', 'M', 'L')),
  sort_order integer not null default 0 check (sort_order >= 0),
  price_cents integer not null check (price_cents > 0),
  unique (menu_item_id, size_code)
);
alter table public.item_sizes enable row level security;
revoke all on public.item_sizes from public, anon, authenticated;
grant select on public.item_sizes to anon, authenticated;
grant insert, update on public.item_sizes to authenticated;
grant all on public.item_sizes to service_role;
create policy sizes_public_read on public.item_sizes for select to anon, authenticated
  using (exists (select 1 from public.menu_items m where m.id = menu_item_id and m.is_active));
create policy sizes_team_read on public.item_sizes for select to authenticated
  using ((select private.app_role()) in ('staff', 'owner'));
create policy sizes_owner_insert on public.item_sizes for insert to authenticated
  with check ((select private.app_role()) = 'owner');
create policy sizes_owner_update on public.item_sizes for update to authenticated
  using ((select private.app_role()) = 'owner') with check ((select private.app_role()) = 'owner');

create table public.price_change_log (
  id uuid primary key default gen_random_uuid(),
  item_size_id uuid not null references public.item_sizes(id) on delete restrict,
  old_price_cents integer not null check (old_price_cents > 0),
  new_price_cents integer not null check (new_price_cents > 0),
  changed_by uuid references public.staff_users(id) on delete restrict,
  changed_at timestamptz not null default now(),
  check (old_price_cents <> new_price_cents)
);
alter table public.price_change_log enable row level security;
revoke all on public.price_change_log from public, anon, authenticated;
grant select on public.price_change_log to authenticated;
grant all on public.price_change_log to service_role;
create policy prices_owner_read on public.price_change_log for select to authenticated
  using ((select private.app_role()) = 'owner');
create index price_change_log_size_time_idx on public.price_change_log(item_size_id, changed_at);
create index price_change_log_actor_idx on public.price_change_log(changed_by);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  display_order_number text not null unique check (btrim(display_order_number) <> ''),
  customer_name text not null check (btrim(customer_name) <> ''),
  customer_email text not null check (btrim(customer_email) <> ''),
  customer_phone text,
  pickup_at timestamptz not null,
  earliest_pickup_at timestamptz not null,
  payment_status text not null default 'pending_payment'
    check (payment_status in ('pending_payment', 'paid', 'expired')),
  ticket_status text check (ticket_status in ('received', 'in_progress', 'ready', 'completed', 'cancelled')),
  subtotal_cents integer not null check (subtotal_cents >= 0),
  tax_rate numeric(7,6) not null check (tax_rate between 0 and 1),
  tax_cents integer not null check (tax_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  email_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ticket_status is null or payment_status = 'paid'),
  check (total_cents::bigint = subtotal_cents::bigint + tax_cents::bigint),
  check (pickup_at >= earliest_pickup_at)
);
alter table public.orders enable row level security;
revoke all on public.orders from public, anon, authenticated;
grant select on public.orders to authenticated;
-- RLS controls rows, not columns: staff/owner cannot edit payment or financial snapshots.
grant update (ticket_status) on public.orders to authenticated;
grant all on public.orders to service_role;
create policy orders_team_read on public.orders for select to authenticated
  using ((select private.app_role()) in ('staff', 'owner'));
create policy orders_team_ticket_update on public.orders for update to authenticated
  using (payment_status = 'paid' and (select private.app_role()) in ('staff', 'owner'))
  with check (payment_status = 'paid' and (select private.app_role()) in ('staff', 'owner'));
create index orders_created_at_idx on public.orders(created_at);
create index orders_ticket_status_idx on public.orders(ticket_status) where payment_status = 'paid';

create table public.order_lines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  item_size_id uuid not null references public.item_sizes(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents > 0),
  item_name_snapshot text not null check (btrim(item_name_snapshot) <> ''),
  size_code_snapshot text not null check (btrim(size_code_snapshot) <> ''),
  spicy_requested boolean not null default false,
  instructions text
);
alter table public.order_lines enable row level security;
revoke all on public.order_lines from public, anon, authenticated;
grant select on public.order_lines to authenticated;
grant all on public.order_lines to service_role;
create policy lines_team_read on public.order_lines for select to authenticated
  using ((select private.app_role()) in ('staff', 'owner'));
create index order_lines_order_id_idx on public.order_lines(order_id);
create index order_lines_item_size_id_idx on public.order_lines(item_size_id);

create table public.order_line_components (
  id uuid primary key default gen_random_uuid(),
  order_line_id uuid not null references public.order_lines(id) on delete restrict,
  component_position smallint not null check (component_position in (1, 2)),
  menu_item_id uuid not null references public.menu_items(id) on delete restrict,
  item_name_snapshot text not null check (btrim(item_name_snapshot) <> ''),
  unique (order_line_id, component_position)
);
alter table public.order_line_components enable row level security;
revoke all on public.order_line_components from public, anon, authenticated;
grant select on public.order_line_components to authenticated;
grant all on public.order_line_components to service_role;
create policy components_team_read on public.order_line_components for select to authenticated
  using ((select private.app_role()) in ('staff', 'owner'));
create index order_line_components_item_idx on public.order_line_components(menu_item_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete restrict,
  stripe_checkout_session_id text not null unique check (btrim(stripe_checkout_session_id) <> ''),
  stripe_payment_intent_id text unique,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'usd' check (currency = 'usd'),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.payments enable row level security;
revoke all on public.payments from public, anon, authenticated;
grant select on public.payments to authenticated;
grant all on public.payments to service_role;
create policy payments_owner_read on public.payments for select to authenticated
  using ((select private.app_role()) = 'owner');

create table public.order_status_log (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  status_kind text not null check (status_kind in ('payment', 'ticket')),
  from_status text,
  to_status text not null,
  changed_by uuid references public.staff_users(id) on delete restrict,
  changed_at timestamptz not null default now(),
  check (from_status is null or from_status <> to_status),
  check (
    (status_kind = 'payment' and to_status in ('pending_payment', 'paid', 'expired')
      and (from_status is null or from_status in ('pending_payment', 'paid', 'expired')))
    or
    (status_kind = 'ticket' and to_status in ('received', 'in_progress', 'ready', 'completed', 'cancelled')
      and (from_status is null or from_status in ('received', 'in_progress', 'ready', 'completed', 'cancelled')))
  )
);
alter table public.order_status_log enable row level security;
revoke all on public.order_status_log from public, anon, authenticated;
grant select on public.order_status_log to authenticated;
grant all on public.order_status_log to service_role;
create policy status_team_read on public.order_status_log for select to authenticated
  using ((select private.app_role()) in ('staff', 'owner'));
create index order_status_log_order_time_idx on public.order_status_log(order_id, changed_at);
create index order_status_log_actor_idx on public.order_status_log(changed_by);

create table public.business_hours (
  day_of_week smallint primary key check (day_of_week between 0 and 6),
  opens_at time,
  closes_at time,
  check ((opens_at is null and closes_at is null)
    or (opens_at is not null and closes_at is not null and opens_at < closes_at))
);
alter table public.business_hours enable row level security;
revoke all on public.business_hours from public, anon, authenticated;
grant select on public.business_hours to anon, authenticated;
grant insert, update on public.business_hours to authenticated;
grant all on public.business_hours to service_role;
create policy hours_public_read on public.business_hours for select to anon, authenticated using (true);
create policy hours_owner_insert on public.business_hours for insert to authenticated
  with check ((select private.app_role()) = 'owner');
create policy hours_owner_update on public.business_hours for update to authenticated
  using ((select private.app_role()) = 'owner') with check ((select private.app_role()) = 'owner');

create table public.settings (
  id smallint primary key default 1 check (id = 1),
  tax_rate numeric(7,6) not null check (tax_rate between 0 and 1),
  regular_lead_minutes integer not null check (regular_lead_minutes > 0),
  catering_lead_minutes integer not null check (catering_lead_minutes >= regular_lead_minutes),
  timezone text not null default 'America/Chicago' check (timezone = 'America/Chicago')
);
alter table public.settings enable row level security;
revoke all on public.settings from public, anon, authenticated;
grant select on public.settings to anon, authenticated;
grant insert, update on public.settings to authenticated;
grant all on public.settings to service_role;
create policy settings_public_read on public.settings for select to anon, authenticated using (true);
create policy settings_owner_insert on public.settings for insert to authenticated
  with check ((select private.app_role()) = 'owner');
create policy settings_owner_update on public.settings for update to authenticated
  using ((select private.app_role()) = 'owner') with check ((select private.app_role()) = 'owner');

create function private.touch_updated_at() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.touch_updated_at() from public, anon, authenticated;
create trigger menu_items_updated_at before update on public.menu_items
  for each row execute function private.touch_updated_at();

-- The definer is needed only to append protected audit rows; no client can call it.
create function private.log_price_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare actor uuid;
begin
  select id into actor from public.staff_users where id = auth.uid();
  insert into public.price_change_log(item_size_id, old_price_cents, new_price_cents, changed_by)
    values (new.id, old.price_cents, new.price_cents, actor);
  return new;
end;
$$;
revoke all on function private.log_price_change() from public, anon, authenticated;
create trigger item_sizes_price_change after update of price_cents on public.item_sizes
  for each row when (old.price_cents is distinct from new.price_cents)
  execute function private.log_price_change();

create function private.guard_order_status() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.payment_status <> 'pending_payment' or new.ticket_status is not null then
      raise exception 'Orders must start pending payment without a ticket' using errcode = '23514';
    end if;
    return new;
  end if;
  if old.payment_status is distinct from new.payment_status then
    if not (old.payment_status = 'pending_payment' and new.payment_status in ('paid', 'expired')) then
      raise exception 'Invalid payment transition' using errcode = '23514';
    end if;
    if new.payment_status = 'paid' and new.ticket_status is distinct from 'received' then
      raise exception 'Payment confirmation must open a received ticket' using errcode = '23514';
    end if;
  end if;
  if old.ticket_status is distinct from new.ticket_status then
    if new.ticket_status = 'cancelled' then
      if (select private.app_role()) is distinct from 'owner' then
        raise exception 'Only the owner can cancel a ticket' using errcode = '42501';
      end if;
      if old.ticket_status is null then
        raise exception 'Only a paid ticket can be cancelled' using errcode = '23514';
      end if;
    elsif not (
      (old.ticket_status is null and old.payment_status = 'pending_payment'
        and new.payment_status = 'paid' and new.ticket_status = 'received')
      or (old.ticket_status = 'received' and new.ticket_status = 'in_progress')
      or (old.ticket_status = 'in_progress' and new.ticket_status = 'ready')
      or (old.ticket_status = 'ready' and new.ticket_status = 'completed')
    ) or new.ticket_status is null then
      raise exception 'Invalid ticket transition' using errcode = '23514';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.guard_order_status() from public, anon, authenticated;
create trigger orders_guard_status before insert or update on public.orders
  for each row execute function private.guard_order_status();

create function private.log_order_status() returns trigger
language plpgsql security definer set search_path = '' as $$
declare actor uuid;
begin
  select id into actor from public.staff_users where id = auth.uid();
  if tg_op = 'INSERT' then
    insert into public.order_status_log(order_id, status_kind, from_status, to_status, changed_by)
      values (new.id, 'payment', null, new.payment_status, actor);
  else
    if old.payment_status is distinct from new.payment_status then
      insert into public.order_status_log(order_id, status_kind, from_status, to_status, changed_by)
        values (new.id, 'payment', old.payment_status, new.payment_status, actor);
    end if;
    if old.ticket_status is distinct from new.ticket_status then
      insert into public.order_status_log(order_id, status_kind, from_status, to_status, changed_by)
        values (new.id, 'ticket', old.ticket_status, new.ticket_status, actor);
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.log_order_status() from public, anon, authenticated;
create trigger orders_status_log after insert or update on public.orders
  for each row execute function private.log_order_status();

-- Paid-order filtering remains an application query; publication enables the kitchen subscription.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.orders;
  end if;
end;
$$;

commit;
