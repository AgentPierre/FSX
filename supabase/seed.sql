-- T23 / SCRUM-62: generated from docs/menu.csv by scripts/generate_menu_seed.py.
-- 46 items, 58 purchasable sizes; integer cents, no invented G7/G8.
-- Repeat runs preserve owner edits; this is initial loading, not a menu sync.
begin;

insert into public.menu_categories(id, name, sort_order) values ('9c8da499-746c-5930-8f87-3ba3ab653e48', 'Appetizers', 1) on conflict (name) do nothing;
insert into public.menu_categories(id, name, sort_order) values ('610f8b54-0be1-5f95-b90e-bc2c14054b8b', 'Soup', 2) on conflict (name) do nothing;
insert into public.menu_categories(id, name, sort_order) values ('8840befa-8dfb-5fe9-988e-28921755391f', 'Gen Joe''s Specials', 3) on conflict (name) do nothing;
insert into public.menu_categories(id, name, sort_order) values ('25efe60f-89bf-58f9-8792-5e6abe5c5bb7', 'Chef''s Specials', 4) on conflict (name) do nothing;
insert into public.menu_categories(id, name, sort_order) values ('6e9411bc-7ff6-57fa-8425-bdb8e74ffca8', 'Fried Rice', 5) on conflict (name) do nothing;
insert into public.menu_categories(id, name, sort_order) values ('787b6be7-3b94-5dfa-a62b-3116108a6bcf', 'Beverages', 6) on conflict (name) do nothing;
insert into public.menu_categories(id, name, sort_order) values ('c7ba5a51-31ac-5be6-a1a2-1a885181e8f9', 'Catering Trays', 7) on conflict (name) do nothing;

insert into public.menu_items (id, category_id, code, name, description, is_spicy_flag, is_catering, sort_order)
values ('b31b516f-c2a5-573e-8132-dab5db891423', (select id from public.menu_categories where name = 'Appetizers'), 'A1', 'Chips (bag)', null, false, false, 1) on conflict (code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('3c2ae83f-446d-5129-8a4a-56199b2a258b', (select id from public.menu_items where code = 'A1'), 'regular', 1, 150) on conflict (menu_item_id, size_code) do nothing;

insert into public.menu_items (id, category_id, code, name, description, is_spicy_flag, is_catering, sort_order)
values ('b30aca9c-e6de-547b-afff-343e4960d8e9', (select id from public.menu_categories where name = 'Appetizers'), 'A2', 'Egg Roll', null, false, false, 2) on conflict (code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('a684f18c-55b1-575d-9626-97f53377615d', (select id from public.menu_items where code = 'A2'), 'regular', 1, 150) on conflict (menu_item_id, size_code) do nothing;

insert into public.menu_items (id, category_id, code, name, description, is_spicy_flag, is_catering, sort_order)
values ('8fe9f5d9-6748-5518-97a2-0afdf5a6ebba', (select id from public.menu_categories where name = 'Appetizers'), 'A3', 'Fried Chicken Wings', '6 pieces', false, false, 3) on conflict (code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('04e5b820-d358-5148-a430-10adfb607f09', (select id from public.menu_items where code = 'A3'), 'regular', 1, 1050) on conflict (menu_item_id, size_code) do nothing;

insert into public.menu_items (id, category_id, code, name, description, is_spicy_flag, is_catering, sort_order)
values ('4764739a-87c1-5257-80ff-6eb13aec0cf9', (select id from public.menu_categories where name = 'Appetizers'), 'A4', 'Chicken Wings with French Fries', null, false, false, 4) on conflict (code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('1809ac73-4ab4-5b97-bd47-d897d15cba86', (select id from public.menu_items where code = 'A4'), 'regular', 1, 1299) on conflict (menu_item_id, size_code) do nothing;

insert into public.menu_items (id, category_id, code, name, description, is_spicy_flag, is_catering, sort_order)
values ('cd48134a-36cf-59b8-a59e-75f0ea9f48be', (select id from public.menu_categories where name = 'Soup'), 'S1', 'Hot and Sour Soup', null, true, false, 1) on conflict (code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('be6af77e-9f07-5e24-bea7-533d29c36d5d', (select id from public.menu_items where code = 'S1'), 'regular', 1, 399) on conflict (menu_item_id, size_code) do nothing;

insert into public.menu_items (id, category_id, code, name, description, is_spicy_flag, is_catering, sort_order)
values ('9a9da66c-14ce-55e9-910a-323a1abf9cc4', (select id from public.menu_categories where name = 'Soup'), 'S2', 'Egg Drop Soup', null, false, false, 2) on conflict (code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('f8e9a867-62c8-54d8-8f3e-9d1c225ce7f8', (select id from public.menu_items where code = 'S2'), 'regular', 1, 399) on conflict (menu_item_id, size_code) do nothing;

insert into public.menu_items (id, category_id, code, name, description, is_spicy_flag, is_catering, sort_order)
values ('bc9d5676-f3f7-58e5-b061-e8d15e0deb34', (select id from public.menu_categories where name = 'Soup'), 'S3', 'Chicken Soup', null, false, false, 3) on conflict (code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('245221d5-e161-5859-8af0-d30fe4a493f7', (select id from public.menu_items where code = 'S3'), 'regular', 1, 700) on conflict (menu_item_id, size_code) do nothing;

insert into public.menu_items (id, category_id, code, name, description, is_spicy_flag, is_catering, sort_order)
values ('137f2e20-b644-51b7-85d8-33dfd0bf9164', (select id from public.menu_categories where name = 'Gen Joe''s Specials'), 'G1', 'Combination Plate', 'Half order of any two from G2-G10', false, false, 1) on conflict (code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('0cca0976-adb6-5bff-a5ca-076d51e9d40d', (select id from public.menu_items where code = 'G1'), 'regular', 1, 1299) on conflict (menu_item_id, size_code) do nothing;

insert into public.menu_items (id, category_id, code, name, description, is_spicy_flag, is_catering, sort_order)
values ('095eed45-b7a3-5bc9-bd3f-613f75225b35', (select id from public.menu_categories where name = 'Gen Joe''s Specials'), 'G2', 'Gen Joe''s Chicken', null, true, false, 2) on conflict (code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('e83133b5-2b60-543c-8a3f-82af11b8810f', (select id from public.menu_items where code = 'G2'), 'regular', 1, 1299) on conflict (menu_item_id, size_code) do nothing;

insert into public.menu_items (id, category_id, code, name, description, is_spicy_flag, is_catering, sort_order)
values ('32aaff9f-fe91-5402-a8c1-381d50bc1681', (select id from public.menu_categories where name = 'Gen Joe''s Specials'), 'G3', 'Moo Goo Gai Pan', null, false, false, 3) on conflict (code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('e9a721f4-9e47-5cee-aa4c-3cef62c942fb', (select id from public.menu_items where code = 'G3'), 'regular', 1, 1299) on conflict (menu_item_id, size_code) do nothing;

insert into public.menu_items (id, category_id, code, name, description, is_spicy_flag, is_catering, sort_order)
values ('a5eafe9a-a497-5df2-9e53-07e8b4198569', (select id from public.menu_categories where name = 'Gen Joe''s Specials'), 'G4', 'Sweet and Sour Chicken', null, false, false, 4) on conflict (code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('e96a3444-5cb3-57c0-b686-961dae442e04', (select id from public.menu_items where code = 'G4'), 'regular', 1, 1299) on conflict (menu_item_id, size_code) do nothing;

insert into public.menu_items (id, category_id, code, name, description, is_spicy_flag, is_catering, sort_order)
values ('6409caf8-70bd-528e-be4c-1553e9e331b1', (select id from public.menu_categories where name = 'Gen Joe''s Specials'), 'G5', 'Broccoli Chicken', null, false, false, 5) on conflict (code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('a96c1f06-cf2b-56d0-9f0d-955972c51b27', (select id from public.menu_items where code = 'G5'), 'regular', 1, 1299) on conflict (menu_item_id, size_code) do nothing;

insert into public.menu_items (id, category_id, code, name, description, is_spicy_flag, is_catering, sort_order)
values ('eeb19677-e26a-577c-855d-0544b4f1ea66', (select id from public.menu_categories where name = 'Gen Joe''s Specials'), 'G6', 'Broccoli Beef', null, false, false, 6) on conflict (code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('cf0453c5-d427-5396-a9f0-5917fad2b58e', (select id from public.menu_items where code = 'G6'), 'regular', 1, 1350) on conflict (menu_item_id, size_code) do nothing;

insert into public.menu_items (id, category_id, code, name, description, is_spicy_flag, is_catering, sort_order)
values ('df9f0f51-159a-5fab-a32f-a23973b555be', (select id from public.menu_categories where name = 'Gen Joe''s Specials'), 'G9', 'Vegetable Delight', null, false, false, 7) on conflict (code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('21ad4191-d32b-5258-a454-7917d401123b', (select id from public.menu_items where code = 'G9'), 'regular', 1, 1250) on conflict (menu_item_id, size_code) do nothing;

insert into public.menu_items (id, category_id, code, name, description, is_spicy_flag, is_catering, sort_order)
values ('aaeacbb9-77f1-528f-8b9f-a27d4dbff0d4', (select id from public.menu_categories where name = 'Gen Joe''s Specials'), 'G10', 'Spicy Mixed Vegetable', null, true, false, 8) on conflict (code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('e22bc765-eabb-53d2-8f47-b4a475b5eb80', (select id from public.menu_items where code = 'G10'), 'regular', 1, 1250) on conflict (menu_item_id, size_code) do nothing;

insert into public.menu_items (id, category_id, code, name, description, is_spicy_flag, is_catering, sort_order)
values ('bf28fad5-07ca-57bf-b2e4-f863a0c48c5e', (select id from public.menu_categories where name = 'Chef''s Specials'), 'C1', 'Pepper Chicken', 'Served with rice.', true, false, 1) on conflict (code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('cccc64be-037a-5be1-b439-7a8001a11fb4', (select id from public.menu_items where code = 'C1'), 'regular', 1, 1299) on conflict (menu_item_id, size_code) do nothing;

insert into public.menu_items (id, category_id, code, name, description, is_spicy_flag, is_catering, sort_order)
values ('43a7bdb7-8f59-590b-bac0-8c9a3de05af4', (select id from public.menu_categories where name = 'Chef''s Specials'), 'C2', 'Szechuan Chicken', 'Served with rice.', true, false, 2) on conflict (code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('dee29944-0b83-5c4a-ad52-b6609f4d98f1', (select id from public.menu_items where code = 'C2'), 'regular', 1, 1299) on conflict (menu_item_id, size_code) do nothing;

insert into public.menu_items (id, category_id, code, name, description, is_spicy_flag, is_catering, sort_order)
values ('6d3384e0-9ad4-56f6-ae71-eaf5fd77d88f', (select id from public.menu_categories where name = 'Chef''s Specials'), 'C3', 'Hot and Sour Chicken', 'Served with rice.', true, false, 3) on conflict (code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('6c826cf6-b23c-5024-bcc8-85b131e708e4', (select id from public.menu_items where code = 'C3'), 'regular', 1, 1299) on conflict (menu_item_id, size_code) do nothing;

insert into public.menu_items (id, category_id, code, name, description, is_spicy_flag, is_catering, sort_order)
values ('35180bef-6967-5a15-aa5d-350d5d96ca3a', (select id from public.menu_categories where name = 'Chef''s Specials'), 'C4', 'Spicy Broccoli Chicken w/ Brown Sauce', 'Served with rice.', true, false, 4) on conflict (code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('976f06bf-151d-5dea-9f42-b0c2b0916d58', (select id from public.menu_items where code = 'C4'), 'regular', 1, 1299) on conflict (menu_item_id, size_code) do nothing;

insert into public.menu_items (id, category_id, code, name, description, is_spicy_flag, is_catering, sort_order)
values ('a12b2086-769c-5b84-a511-8917a730fabd', (select id from public.menu_categories where name = 'Chef''s Specials'), 'C5', 'Vegetable Noodle', 'No rice included.', false, false, 5) on conflict (code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('8670961f-6177-5044-8919-a5244b9e38cd', (select id from public.menu_items where code = 'C5'), 'regular', 1, 1299) on conflict (menu_item_id, size_code) do nothing;

insert into public.menu_items (id, category_id, code, name, description, is_spicy_flag, is_catering, sort_order)
values ('c31ffc38-b0ce-58bf-b852-f9418e30e8da', (select id from public.menu_categories where name = 'Chef''s Specials'), 'C6', 'Mandarin Chicken', 'Served with rice.', true, false, 6) on conflict (code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('f8300aa1-2fa7-521e-a414-84abbf94e263', (select id from public.menu_items where code = 'C6'), 'regular', 1, 1299) on conflict (menu_item_id, size_code) do nothing;

insert into public.menu_items (id, category_id, code, name, description, is_spicy_flag, is_catering, sort_order)
values ('0dbf63e6-fdc9-50bc-8df4-c7dd76b21efd', (select id from public.menu_categories where name = 'Chef''s Specials'), 'C7', 'Kung Pao Chicken', 'Served with rice.', true, false, 7) on conflict (code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('28361619-cda1-562a-bd35-4f9b1ecf1b94', (select id from public.menu_items where code = 'C7'), 'regular', 1, 1299) on conflict (menu_item_id, size_code) do nothing;

insert into public.menu_items (id, category_id, code, name, description, is_spicy_flag, is_catering, sort_order)
values ('976c64b2-29e1-5079-ad04-4f1adc17f601', (select id from public.menu_categories where name = 'Chef''s Specials'), 'C8', 'Chicken with Cashew Nuts', 'Served with rice.', false, false, 8) on conflict (code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('2bbcd203-b51c-50f2-95ef-5869f85b8b85', (select id from public.menu_items where code = 'C8'), 'regular', 1, 1299) on conflict (menu_item_id, size_code) do nothing;

insert into public.menu_items (id, category_id, code, name, description, is_spicy_flag, is_catering, sort_order)
values ('5e710857-0080-57de-8b36-3d6829d9c0ec', (select id from public.menu_categories where name = 'Chef''s Specials'), 'C9', 'Pepper Steak', 'Served with rice.', false, false, 9) on conflict (code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('8b3db836-7608-57ff-919f-a58898c63ce9', (select id from public.menu_items where code = 'C9'), 'regular', 1, 1299) on conflict (menu_item_id, size_code) do nothing;

insert into public.menu_items (id, category_id, code, name, description, is_spicy_flag, is_catering, sort_order)
values ('43a8b79f-b28d-58d8-a442-b9af9780d239', (select id from public.menu_categories where name = 'Chef''s Specials'), 'C10', 'Szechuan Beef', 'Served with rice.', true, false, 10) on conflict (code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('5ca406fe-0994-532e-9479-22a6c7af4d03', (select id from public.menu_items where code = 'C10'), 'regular', 1, 1299) on conflict (menu_item_id, size_code) do nothing;

insert into public.menu_items (id, category_id, code, name, description, is_spicy_flag, is_catering, sort_order)
values ('96064da7-84f3-5d79-9e50-f0b1dc14ebdf', (select id from public.menu_categories where name = 'Chef''s Specials'), 'C11', 'Chicken Lo Mein', 'No rice included.', false, false, 11) on conflict (code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('ff0d3a34-b5b5-5e85-8a27-2541b00e7d9f', (select id from public.menu_items where code = 'C11'), 'regular', 1, 1299) on conflict (menu_item_id, size_code) do nothing;

insert into public.menu_items (id, category_id, code, name, description, is_spicy_flag, is_catering, sort_order)
values ('b3280df7-903c-5797-a016-a02873fb5136', (select id from public.menu_categories where name = 'Chef''s Specials'), 'C12', 'Beef Lo Mein', 'No rice included.', false, false, 12) on conflict (code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('67d8a522-bc46-54bd-929e-62411696d7ba', (select id from public.menu_items where code = 'C12'), 'regular', 1, 1299) on conflict (menu_item_id, size_code) do nothing;

insert into public.menu_items (id, category_id, code, name, description, is_spicy_flag, is_catering, sort_order)
values ('6d50e714-13b6-53c9-a430-146ee21d3142', (select id from public.menu_categories where name = 'Chef''s Specials'), 'C13', 'Chicken & Shrimp with Vegetable', 'Served with rice.', false, false, 13) on conflict (code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('46206669-ecfd-5bb8-958f-799e35212a7d', (select id from public.menu_items where code = 'C13'), 'regular', 1, 1350) on conflict (menu_item_id, size_code) do nothing;

insert into public.menu_items (id, category_id, code, name, description, is_spicy_flag, is_catering, sort_order)
values ('b78d0898-be25-5a0b-af91-11eed0bfefb3', (select id from public.menu_categories where name = 'Chef''s Specials'), 'C14', 'Chicken & Shrimp Sauteed', 'Served with rice.', false, false, 14) on conflict (code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('2cd9962a-6299-585a-a0ae-a3a1ca3efb1e', (select id from public.menu_items where code = 'C14'), 'regular', 1, 1350) on conflict (menu_item_id, size_code) do nothing;

insert into public.menu_items (id, category_id, code, name, description, is_spicy_flag, is_catering, sort_order)
values ('1157d1d5-52de-5a56-95af-c14a767dcb6b', (select id from public.menu_categories where name = 'Chef''s Specials'), 'C15', 'Triple Delight', 'Chicken, shrimp and beef. Served with rice.', false, false, 15) on conflict (code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('e8486f66-e324-5928-b3cd-2988d8e64740', (select id from public.menu_items where code = 'C15'), 'regular', 1, 1350) on conflict (menu_item_id, size_code) do nothing;

insert into public.menu_items (id, category_id, code, name, description, is_spicy_flag, is_catering, sort_order)
values ('c4d87e17-871a-53ec-8d70-675561a5f64a', (select id from public.menu_categories where name = 'Chef''s Specials'), 'C16', 'Tri Kung Pao', 'Chicken, shrimp and beef with peanuts. Served with rice. Contains peanuts.', true, false, 16) on conflict (code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('5dc4f5f4-a69d-541f-81bd-c1b90e568782', (select id from public.menu_items where code = 'C16'), 'regular', 1, 1350) on conflict (menu_item_id, size_code) do nothing;

insert into public.menu_items (id, category_id, code, name, description, is_spicy_flag, is_catering, sort_order)
values ('933c9464-f9aa-5983-af28-037789e3b11d', (select id from public.menu_categories where name = 'Chef''s Specials'), 'C17', 'Special Lo Mein', 'Chicken, shrimp and beef. No rice included.', false, false, 17) on conflict (code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('64efd1ff-3050-5b55-8d99-069eae7dcd6d', (select id from public.menu_items where code = 'C17'), 'regular', 1, 1350) on conflict (menu_item_id, size_code) do nothing;

insert into public.menu_items (id, category_id, code, name, description, is_spicy_flag, is_catering, sort_order)
values ('14e132bd-cb30-50bd-988f-a279c1d6d0dd', (select id from public.menu_categories where name = 'Chef''s Specials'), 'C18', 'Shrimp with Vegetable', 'Served with rice.', false, false, 18) on conflict (code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('e5af802a-5fb9-58bd-a645-9bbd631259ea', (select id from public.menu_items where code = 'C18'), 'regular', 1, 1350) on conflict (menu_item_id, size_code) do nothing;

insert into public.menu_items (id, category_id, code, name, description, is_spicy_flag, is_catering, sort_order)
values ('48082724-2741-536c-bf22-24fc6787d3a9', (select id from public.menu_categories where name = 'Chef''s Specials'), 'C19', 'Panda Pak', 'Fried rice, sweet and sour chicken and an egg roll. Fixed plate; no substitutions.', false, false, 19) on conflict (code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('518d5afb-84a5-51d5-ac0e-1e0c72091410', (select id from public.menu_items where code = 'C19'), 'regular', 1, 1299) on conflict (menu_item_id, size_code) do nothing;

insert into public.menu_items (id, category_id, code, name, description, is_spicy_flag, is_catering, sort_order)
values ('358b9ed1-d9f6-5666-9289-6f2dfee7e66e', (select id from public.menu_categories where name = 'Chef''s Specials'), 'C20', 'Mongolian Beef', 'Served with rice.', false, false, 20) on conflict (code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('55994ff7-e6ee-54c9-84c0-5772c49c040f', (select id from public.menu_items where code = 'C20'), 'regular', 1, 1299) on conflict (menu_item_id, size_code) do nothing;

insert into public.menu_items (id, category_id, code, name, description, is_spicy_flag, is_catering, sort_order)
values ('ef0ddf23-624f-5651-9407-674ca38119f4', (select id from public.menu_categories where name = 'Chef''s Specials'), 'C21', 'Chef''s Fried Rice with Chicken Wings', '5 chicken wings', false, false, 21) on conflict (code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('3067b046-0fee-54e0-bc0b-e7720e7835e8', (select id from public.menu_items where code = 'C21'), 'regular', 1, 1399) on conflict (menu_item_id, size_code) do nothing;

insert into public.menu_items (id, category_id, code, name, description, is_spicy_flag, is_catering, sort_order)
values ('3db57eee-49f0-5e49-9dd9-9479c03f1204', (select id from public.menu_categories where name = 'Fried Rice'), 'R1', 'Chef''s Fried Rice', null, false, false, 1) on conflict (code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('bc261cfc-54a3-5f03-a9d8-34af27b269d2', (select id from public.menu_items where code = 'R1'), 'sm', 1, 750) on conflict (menu_item_id, size_code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('06d75014-9a8d-5ab3-a3d0-f3dcba26ec39', (select id from public.menu_items where code = 'R1'), 'lg', 2, 1190) on conflict (menu_item_id, size_code) do nothing;

insert into public.menu_items (id, category_id, code, name, description, is_spicy_flag, is_catering, sort_order)
values ('aa7ea5ba-f685-55c8-a436-50f88d57ebb9', (select id from public.menu_categories where name = 'Fried Rice'), 'R2', 'Shrimp Fried Rice', null, false, false, 2) on conflict (code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('ac3be781-5e18-517c-b3bd-cfed35114ffb', (select id from public.menu_items where code = 'R2'), 'sm', 1, 750) on conflict (menu_item_id, size_code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('8357b715-0ebf-57bf-81ca-2bd83d74dba3', (select id from public.menu_items where code = 'R2'), 'lg', 2, 1190) on conflict (menu_item_id, size_code) do nothing;

insert into public.menu_items (id, category_id, code, name, description, is_spicy_flag, is_catering, sort_order)
values ('c3f2f26e-0a4b-519d-b957-a52cedb105a0', (select id from public.menu_categories where name = 'Fried Rice'), 'R3', 'Chicken Fried Rice', null, false, false, 3) on conflict (code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('88583ff4-3414-57da-98a3-6e65d9ed7c8c', (select id from public.menu_items where code = 'R3'), 'sm', 1, 750) on conflict (menu_item_id, size_code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('d6ff3e7d-fd52-5126-a4c2-f2bf4205fb67', (select id from public.menu_items where code = 'R3'), 'lg', 2, 1190) on conflict (menu_item_id, size_code) do nothing;

insert into public.menu_items (id, category_id, code, name, description, is_spicy_flag, is_catering, sort_order)
values ('ed9b5168-0581-5214-87c2-d53a64a6bc90', (select id from public.menu_categories where name = 'Fried Rice'), 'R4', 'Steamed Rice', null, false, false, 4) on conflict (code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('91d4e477-6fab-57d5-8d1d-5f72ade47246', (select id from public.menu_items where code = 'R4'), 'sm', 1, 400) on conflict (menu_item_id, size_code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('c10054ff-0275-5ecd-a064-93f7519b0909', (select id from public.menu_items where code = 'R4'), 'lg', 2, 600) on conflict (menu_item_id, size_code) do nothing;

insert into public.menu_items (id, category_id, code, name, description, is_spicy_flag, is_catering, sort_order)
values ('fa301f85-e45a-5083-917e-bca3c1116628', (select id from public.menu_categories where name = 'Fried Rice'), 'R5', 'Beef Fried Rice', null, false, false, 5) on conflict (code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('34f230b1-4e9c-5a59-9c32-d5ed2e6f2a3e', (select id from public.menu_items where code = 'R5'), 'sm', 1, 800) on conflict (menu_item_id, size_code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('0f701424-526e-5f55-af2f-7ea0992194aa', (select id from public.menu_items where code = 'R5'), 'lg', 2, 1299) on conflict (menu_item_id, size_code) do nothing;

insert into public.menu_items (id, category_id, code, name, description, is_spicy_flag, is_catering, sort_order)
values ('32f8dbfb-0cb1-577d-a47d-e8fd83ce6889', (select id from public.menu_categories where name = 'Fried Rice'), 'R6', 'Vegetable Fried Rice', null, false, false, 6) on conflict (code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('8a2a306a-acfe-598e-8605-4f970c744b4a', (select id from public.menu_items where code = 'R6'), 'sm', 1, 700) on conflict (menu_item_id, size_code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('56648f6e-8bb9-5a26-bf00-25e4ee75ee36', (select id from public.menu_items where code = 'R6'), 'lg', 2, 1180) on conflict (menu_item_id, size_code) do nothing;

insert into public.menu_items (id, category_id, code, name, description, is_spicy_flag, is_catering, sort_order)
values ('e2b64d61-ae3e-5319-9efc-7ba29416185d', (select id from public.menu_categories where name = 'Beverages'), 'B1', 'Soft Drink or Iced Tea', 'Choose your drink from the fridge at pickup.', false, false, 1) on conflict (code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('5c0ec93d-4708-5edd-95c7-05131f5f6d7a', (select id from public.menu_items where code = 'B1'), 'regular', 1, 150) on conflict (menu_item_id, size_code) do nothing;

insert into public.menu_items (id, category_id, code, name, description, is_spicy_flag, is_catering, sort_order)
values ('e4d49b0d-cf9d-5574-9e02-e8aa9dd567e6', (select id from public.menu_categories where name = 'Catering Trays'), 'T1', 'Chicken Tray', 'Small / Medium / Large tray. Order ahead recommended', false, true, 1) on conflict (code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('2e572b44-b324-5ac5-850e-9c72b0b8677b', (select id from public.menu_items where code = 'T1'), 'S', 1, 3999) on conflict (menu_item_id, size_code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('da393558-68dc-50d0-a591-301994f0adad', (select id from public.menu_items where code = 'T1'), 'M', 2, 5999) on conflict (menu_item_id, size_code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('24ae2804-734a-5f86-b37c-87cc97a95750', (select id from public.menu_items where code = 'T1'), 'L', 3, 7999) on conflict (menu_item_id, size_code) do nothing;

insert into public.menu_items (id, category_id, code, name, description, is_spicy_flag, is_catering, sort_order)
values ('24543798-3a17-5652-b83b-0b819d6adbc3', (select id from public.menu_categories where name = 'Catering Trays'), 'T2', 'Shrimp Tray', 'Small / Medium / Large tray. Order ahead recommended', false, true, 2) on conflict (code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('d0bbd681-341f-57f0-b6c9-d05412bdb41f', (select id from public.menu_items where code = 'T2'), 'S', 1, 3999) on conflict (menu_item_id, size_code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('8f9b3080-483c-54fa-bfea-5d027275dd4f', (select id from public.menu_items where code = 'T2'), 'M', 2, 5999) on conflict (menu_item_id, size_code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('311e43e2-bc06-5857-9550-7f0913d22a98', (select id from public.menu_items where code = 'T2'), 'L', 3, 7999) on conflict (menu_item_id, size_code) do nothing;

insert into public.menu_items (id, category_id, code, name, description, is_spicy_flag, is_catering, sort_order)
values ('77b137c0-ba42-5cde-8bf1-499a777cdad5', (select id from public.menu_categories where name = 'Catering Trays'), 'T3', 'Chef''s Fried Rice Tray', 'Small / Medium / Large tray. Order ahead recommended', false, true, 3) on conflict (code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('1954155c-66db-54af-9073-df943ac2fe47', (select id from public.menu_items where code = 'T3'), 'S', 1, 3999) on conflict (menu_item_id, size_code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('9405864e-533c-595f-b3bc-e1ef44394c00', (select id from public.menu_items where code = 'T3'), 'M', 2, 5999) on conflict (menu_item_id, size_code) do nothing;
insert into public.item_sizes(id, menu_item_id, size_code, sort_order, price_cents) values ('9008842b-6f63-55c8-91d5-c06f5d7adaf7', (select id from public.menu_items where code = 'T3'), 'L', 3, 7999) on conflict (menu_item_id, size_code) do nothing;

-- Restaurant configuration from CLAUDE.md, not invented menu prices.
insert into public.settings (id, tax_rate, regular_lead_minutes, catering_lead_minutes, timezone) values (1, 0.082500, 15, 40, 'America/Chicago') on conflict (id) do nothing;
insert into public.business_hours(day_of_week, opens_at, closes_at) values
  (0, null, null), (1, '11:00', '21:00'), (2, '11:00', '21:00'),
  (3, '11:00', '21:00'), (4, '11:00', '21:00'), (5, '11:00', '21:00'),
  (6, '11:00', '21:00') on conflict (day_of_week) do nothing;

commit;
