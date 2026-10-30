-- Adds G11 Sesame Chicken ($12.99, spicy allowed, "Contains sesame."), confirmed by the owner on 30 Oct 2026.
-- Same pattern as the 19 Oct catch-up: on a fresh database the category does not exist yet, so every
-- statement affects 0 rows and supabase/seed.sql loads the item; on an existing database it is added once.
-- G11 is new (the printed menu has no G7, G8 or G11) and is deliberately NOT a Combination Plate half:
-- the plate still offers G2-G10 only.
begin;

insert into public.menu_items(id, category_id, code, name, description, is_spicy_flag, is_catering, sort_order)
select 'eaaecbb1-f7f5-5a7c-8358-c7737106f17b', (select id from public.menu_categories where name = 'Gen Joe''s Specials'), 'G11', 'Sesame Chicken', 'Contains sesame.', false, false, 9
where exists (select 1 from public.menu_categories where name = 'Gen Joe''s Specials') on conflict (code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents)
select '6643c86e-e33e-5ac2-b347-defa7d033556', (select id from public.menu_items where code = 'G11'), 'regular', 1, 1299
where exists (select 1 from public.menu_items where code = 'G11') on conflict (menu_item_id, size_code) do nothing;

commit;
