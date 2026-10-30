-- SCRUM-65 / owner decision 30 Oct 2026: kitchen staff may mark a menu item sold out (and available again).
-- Sold out is per item (menu_items.is_available). Everything else on a menu item stays owner-only.
--
-- Staff and owner share the database role "authenticated", so a column grant cannot tell them apart.
-- Instead: a row policy lets staff update menu_items, and a guard trigger refuses a staff update that
-- changes anything except is_available. The owner policy and all other tables are unchanged.
-- Prices (item_sizes), categories, settings and creating items remain owner-only, and an inactive account
-- has no role, so it can do none of this (private.app_role() returns null for it).
begin;

create policy items_staff_update on public.menu_items for update to authenticated
  using ((select private.app_role()) = 'staff')
  with check ((select private.app_role()) = 'staff');

create function private.guard_staff_menu_edit() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  -- updated_at is set by the touch trigger, so it is ignored when comparing the two rows.
  if (select private.app_role()) = 'staff'
     and (to_jsonb(new) - 'is_available' - 'updated_at') is distinct from (to_jsonb(old) - 'is_available' - 'updated_at') then
    raise exception 'Staff can only change whether an item is sold out' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_staff_menu_edit() from public, anon, authenticated;
create trigger menu_items_staff_guard before update on public.menu_items
  for each row execute function private.guard_staff_menu_edit();

commit;
