-- Catch-up for databases seeded before the menu was corrected (PR #9, 15 Oct 2026).
-- 1) adds A4 and C19-C21, 2) fixes customer-facing descriptions (C16 peanut allergen etc.).
-- Safe to run anywhere: on a fresh database the categories/items do not exist yet, so every
-- statement affects 0 rows and supabase/seed.sql loads the corrected menu. Existing rows are only
-- updated while the description still holds the OLD text, so owner edits are never overwritten.
begin;

insert into public.menu_items(id, category_id, code, name, description, is_spicy_flag, is_catering, sort_order)
select '4764739a-87c1-5257-80ff-6eb13aec0cf9', (select id from public.menu_categories where name = 'Appetizers'), 'A4', 'Chicken Wings with French Fries', null, false, false, 4
where exists (select 1 from public.menu_categories where name = 'Appetizers') on conflict (code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents)
select '1809ac73-4ab4-5b97-bd47-d897d15cba86', (select id from public.menu_items where code = 'A4'), 'regular', 1, 1299
where exists (select 1 from public.menu_items where code = 'A4') on conflict (menu_item_id, size_code) do nothing;

insert into public.menu_items(id, category_id, code, name, description, is_spicy_flag, is_catering, sort_order)
select '48082724-2741-536c-bf22-24fc6787d3a9', (select id from public.menu_categories where name = 'Chef''s Specials'), 'C19', 'Panda Pak', 'Fried rice, sweet and sour chicken and an egg roll. Fixed plate; no substitutions.', false, false, 19
where exists (select 1 from public.menu_categories where name = 'Chef''s Specials') on conflict (code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents)
select '518d5afb-84a5-51d5-ac0e-1e0c72091410', (select id from public.menu_items where code = 'C19'), 'regular', 1, 1299
where exists (select 1 from public.menu_items where code = 'C19') on conflict (menu_item_id, size_code) do nothing;

insert into public.menu_items(id, category_id, code, name, description, is_spicy_flag, is_catering, sort_order)
select '358b9ed1-d9f6-5666-9289-6f2dfee7e66e', (select id from public.menu_categories where name = 'Chef''s Specials'), 'C20', 'Mongolian Beef', 'Served with rice.', false, false, 20
where exists (select 1 from public.menu_categories where name = 'Chef''s Specials') on conflict (code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents)
select '55994ff7-e6ee-54c9-84c0-5772c49c040f', (select id from public.menu_items where code = 'C20'), 'regular', 1, 1299
where exists (select 1 from public.menu_items where code = 'C20') on conflict (menu_item_id, size_code) do nothing;

insert into public.menu_items(id, category_id, code, name, description, is_spicy_flag, is_catering, sort_order)
select 'ef0ddf23-624f-5651-9407-674ca38119f4', (select id from public.menu_categories where name = 'Chef''s Specials'), 'C21', 'Chef''s Fried Rice with Chicken Wings', '5 chicken wings', false, false, 21
where exists (select 1 from public.menu_categories where name = 'Chef''s Specials') on conflict (code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents)
select '3067b046-0fee-54e0-bc0b-e7720e7835e8', (select id from public.menu_items where code = 'C21'), 'regular', 1, 1399
where exists (select 1 from public.menu_items where code = 'C21') on conflict (menu_item_id, size_code) do nothing;

update public.menu_items set description = 'Served with rice.' where code = 'C1' and description is null;
update public.menu_items set description = 'Served with rice.' where code = 'C2' and description is null;
update public.menu_items set description = 'Served with rice.' where code = 'C3' and description is null;
update public.menu_items set description = 'Served with rice.' where code = 'C4' and description is null;
update public.menu_items set description = 'No rice included.' where code = 'C5' and description is null;
update public.menu_items set description = 'Served with rice.' where code = 'C6' and description is null;
update public.menu_items set description = 'Served with rice.' where code = 'C7' and description is null;
update public.menu_items set description = 'Served with rice.' where code = 'C8' and description is null;
update public.menu_items set description = 'Served with rice.' where code = 'C9' and description is null;
update public.menu_items set description = 'Served with rice.' where code = 'C10' and description is null;
update public.menu_items set description = 'No rice included.' where code = 'C11' and description is null;
update public.menu_items set description = 'No rice included.' where code = 'C12' and description is null;
update public.menu_items set description = 'Served with rice.' where code = 'C13' and description is null;
update public.menu_items set description = 'Served with rice.' where code = 'C14' and description is null;
update public.menu_items set description = 'Chicken, shrimp and beef. Served with rice.' where code = 'C15' and description = 'Chicken, shrimp, beef';
update public.menu_items set description = 'Chicken, shrimp and beef with peanuts. Served with rice. Contains peanuts.' where code = 'C16' and description = 'Chicken, shrimp & beef w/ peanut';
update public.menu_items set description = 'Chicken, shrimp and beef. No rice included.' where code = 'C17' and description = 'Chicken, shrimp & beef';
update public.menu_items set description = 'Served with rice.' where code = 'C18' and description is null;
update public.menu_items set description = 'Choose your drink from the fridge at pickup.' where code = 'B1' and description is null;

commit;
