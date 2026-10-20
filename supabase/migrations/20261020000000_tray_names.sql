-- Tray names (PR #9 follow-up, 20 Oct 2026): make the catering trays specific.
--   T1 Chicken Tray -> Chicken Fried Rice Tray, T2 Shrimp Tray -> Shrimp Fried Rice Tray,
--   T3 Chef's Fried Rice Tray keeps its name and says what is in it.
-- A separate migration because 20261019000000 may already be applied. Updates only fire while the old
-- text is still there (owner edits are preserved); on a fresh database they affect 0 rows and the seed
-- loads the new names. Past orders keep the name they were placed under (order_lines snapshot).
begin;

update public.menu_items set name = 'Chicken Fried Rice Tray' where code = 'T1' and name = 'Chicken Tray';
update public.menu_items set name = 'Shrimp Fried Rice Tray' where code = 'T2' and name = 'Shrimp Tray';
update public.menu_items
  set description = 'Chicken and shrimp fried rice. Small / Medium / Large tray. Order ahead recommended'
  where code = 'T3' and description = 'Small / Medium / Large tray. Order ahead recommended';

commit;
