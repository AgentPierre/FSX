# Tables overview — W2 support (T14/T15)

Prepared by Perry for Charles, 7 Oct 2026; updated to the final ERD decisions from Charles's summary and Hiab's PR #5 review. This is a schema document, not a migration. The matching diagram is in [erd.md](erd.md).

Sources: [CLAUDE.md](../CLAUDE.md), the W2 prompt in [PERRY.md](PERRY.md), [erd-review-and-answers.md](erd-review-and-answers.md), and the final Visio ERD and `Team09-ERD-Summary (Hiab edits).docx` in `docs/erd/`. The final summary and Hiab's PR #5 review supersede the older payment/status and open-item notes. The existing column dictionary and relationships are retained.

## Conventions and decisions

- PostgreSQL types are used. `timestamptz` stores instants; business-hour `time` values and reporting days are interpreted in `America/Chicago`. No money uses floating point: all amounts and unit prices are integer cents. Tax rate is a decimal fraction (`0.0825` for the currently documented 8.25%), not money.
- `PK` = primary key; `FK` = foreign key; `UQ` = unique. `—` means no key. Every row below explicitly states nullability. Proposed UUID PKs are server-generated, and timestamps are server-set.
- Prices belong exclusively to `item_sizes`; an unsized item has one `regular` size. Menu availability and archival are independent flags. Item-level availability is the current working assumption, pending sponsor confirmation about individual sizes selling out.
- Historical orders retain names, size labels, unit prices, tax rate, and totals. Never hard-delete menu data referenced by historical lines, combo components, or price history. Size/component name snapshots match Charles's final column dictionary.
- Customers are guests: no customer table. A ticket is a paid order: no ticket table. `staff_users` contains roles only; Supabase Auth owns credentials.
- This documents the final ERD's 12 application tables. BR-08, BR-20, BR-23, BR-24 and BR-26 are decided as recorded below. No SQL, migrations, seeds, triggers, or database changes are included.

## 1. `menu_categories`

Groups menu items for customer browsing and owner menu management.

| Column | Type | Keys | Nullable | Description |
|---|---|---|---|---|
| `id` | `uuid` | PK | No | Identifies the category. |
| `name` | `text` | UQ | No | Holds the category's displayed name. |
| `sort_order` | `integer` | — | No | Controls category display order, proposed default `0`. |

Proposed rules: names are nonblank and sort order is nonnegative; removing a populated category requires moving its items first.

## 2. `menu_items`

Defines a dish and its display attributes, independently of size-specific prices.

| Column | Type | Keys | Nullable | Description |
|---|---|---|---|---|
| `id` | `uuid` | PK | No | Identifies the menu item. |
| `category_id` | `uuid` | FK → `menu_categories.id` | No | Assigns the item to its category. |
| `code` | `text` | UQ | No | Holds the sponsor's menu code, such as `G1` or `R1`. |
| `name` | `text` | — | No | Holds the current customer-facing item name. |
| `description` | `text` | — | Yes | Describes the dish when descriptive text is available. |
| `is_available` | `boolean` | — | No | Enables ordering today, proposed default `true`, independently of archival. |
| `is_active` | `boolean` | — | No | Keeps the item on the customer menu, proposed default `true`, and becomes `false` on archival. |
| `is_spicy_flag` | `boolean` | — | No | Displays the menu's spicy star, proposed default `false`, without defining the customer's spicy request. |
| `is_catering` | `boolean` | — | No | Marks an item as requiring the catering lead time, proposed default `false`. |
| `sort_order` | `integer` | — | No | Controls item display order within its category, proposed default `0`. |
| `created_at` | `timestamptz` | — | No | Records when the item was created. |
| `updated_at` | `timestamptz` | — | No | Records the latest item edit for future menu refresh and audit behavior. |

Rules: codes and names are nonblank; orderability requires both active and available. No price column belongs here. Archival preserves referenced records; no daily automatic availability reset is assumed.

## 3. `item_sizes`

Defines each purchasable size and its current unit price.

| Column | Type | Keys | Nullable | Description |
|---|---|---|---|---|
| `id` | `uuid` | PK | No | Identifies the purchasable item-size combination. |
| `menu_item_id` | `uuid` | FK → `menu_items.id`; part of UQ | No | Identifies the dish this size belongs to. |
| `size_code` | `text` | Part of UQ | No | Holds the size identifier, proposed values `regular`, `sm`, `lg`, `S`, `M`, or `L`. |
| `sort_order` | `integer` | — | No | Controls size display order, proposed default `0`. |
| `price_cents` | `integer` | — | No | Holds the current server-authoritative unit price in cents. |

Rules: unique `(menu_item_id, size_code)` and `CHECK (price_cents > 0)`; $0 sizes are not allowed. Unsized items use `regular`, rice uses `sm`/`lg`, and trays use `S`/`M`/`L`. Each orderable item needs at least one size, enforced during future menu writes. Size-level availability remains open rather than a second assumed flag.

## 4. `price_change_log`

Retains the old and new prices of a size when the owner changes its price.

| Column | Type | Keys | Nullable | Description |
|---|---|---|---|---|
| `id` | `uuid` | PK | No | Identifies a price-change event. |
| `item_size_id` | `uuid` | FK → `item_sizes.id` | No | Identifies the size whose price changed. |
| `old_price_cents` | `integer` | — | No | Records the previous unit price in cents. |
| `new_price_cents` | `integer` | — | No | Records the replacement unit price in cents. |
| `changed_by` | `uuid` | FK → `staff_users.id` | Yes | Records the owner responsible when authenticated actor information is available. |
| `changed_at` | `timestamptz` | — | No | Records when the price changed. |

Proposed rules: old and new prices reflect the positive item-size price and differ; log actual updates, not initial insertion. A null actor means a system action, not permission for an anonymous price edit. Future T23 work will define the trigger and secure actor attribution.

## 5. `orders`

Stores a guest checkout, its financial snapshots, and its payment and fulfillment states.

| Column | Type | Keys | Nullable | Description |
|---|---|---|---|---|
| `id` | `uuid` | PK | No | Identifies the order internally and in Stripe's order reference. |
| `display_order_number` | `text` | UQ | No | Holds a short human-readable pickup reference generated at order creation. |
| `customer_name` | `text` | — | No | Records the guest's name for pickup. |
| `customer_email` | `text` | — | No | Records the required destination for the order-ready email. |
| `customer_phone` | `text` | — | Yes | Records an optional contact phone number. |
| `pickup_at` | `timestamptz` | — | No | Records the pickup time selected at checkout. |
| `earliest_pickup_at` | `timestamptz` | — | No | Snapshots the earliest eligible pickup time computed at checkout. |
| `payment_status` | `text` | — | No | Records `pending_payment`, `paid`, or `expired`, initially `pending_payment`. |
| `ticket_status` | `text` | — | Yes | Records `received`, `in_progress`, `ready`, `completed`, or final owner-only `cancelled`, and is initially null. |
| `subtotal_cents` | `integer` | — | No | Snapshots the server-calculated sum of line unit prices times quantities. |
| `tax_rate` | `numeric(7,6)` | — | No | Snapshots the tax fraction applied to this order. |
| `tax_cents` | `integer` | — | No | Snapshots the tax amount rounded to integer cents at checkout. |
| `total_cents` | `integer` | — | No | Snapshots the payable amount as subtotal plus tax. |
| `email_sent_at` | `timestamptz` | — | Yes | Records successful dispatch of the one order-ready email, with null meaning not yet sent. |
| `created_at` | `timestamptz` | — | No | Records when the pending checkout was created. |
| `updated_at` | `timestamptz` | — | No | Records the latest order update. |

Rules and proposals:

- The source requires display numbers unique at least per day. This draft proposes global uniqueness for simpler pickup lookup; Charles must choose the format and allocation method, including collision handling. A date-prefixed sequence is one possible format, not an approved choice.
- Payment values are `pending_payment`, `paid`, `expired`; ticket values are `received`, `in_progress`, `ready`, `completed`, `cancelled`. Ticket status stays null unless paid: `CHECK (ticket_status IS NULL OR payment_status = 'paid')`. Only verified payment confirmation opens a received ticket. An abandoned checkout becomes expired; a retry creates a new order.
- The cashier/counter or owner advances `received → in_progress → ready → completed`. Only the owner sets `cancelled`, for example for a no-show or after a refund in Stripe. Cancelled is final and cannot be reopened; payment remains paid. There is no refunded payment value.
- The server recalculates all prices. Amounts are nonnegative, `total_cents = subtotal_cents + tax_cents`, and tax rate is between `0` and `1`. Tax is represented as a decimal fraction and rounded to integer cents at checkout.
- Selected pickup must be at or after the stored earliest pickup and satisfy business hours. Regular orders require at least 15 minutes, catering orders at least 40, and mixed orders take the longer lead time, using settings at checkout.
- Historical totals and tax rate are immutable after checkout; refunds do not rewrite the original sale. Reports exclude cancelled tickets (BR-25) and are labeled **Online orders only**; refunds are issued in Stripe (BR-30), followed by owner cancellation (BR-29).

## 6. `order_lines`

Stores each ordered size, its checkout snapshots, and the guest's preparation choices.

| Column | Type | Keys | Nullable | Description |
|---|---|---|---|---|
| `id` | `uuid` | PK | No | Identifies an order line. |
| `order_id` | `uuid` | FK → `orders.id` | No | Identifies the order containing the line. |
| `item_size_id` | `uuid` | FK → `item_sizes.id` | No | Identifies the purchased item and size through its size row. |
| `quantity` | `integer` | — | No | Records the number of identical units ordered. |
| `unit_price_cents` | `integer` | — | No | Snapshots the server-authoritative price of one unit at checkout. |
| `item_name_snapshot` | `text` | — | No | Preserves the name displayed when the item was ordered. |
| `size_code_snapshot` | `text` | — | No | Preserves the size identifier displayed at checkout if the current size later changes. |
| `spicy_requested` | `boolean` | — | No | Records the guest's spicy preparation request, proposed default `false`. |
| `instructions` | `text` | — | Yes | Records optional preparation instructions. |

Rules: quantity is positive and `CHECK (unit_price_cents > 0)` disallows $0 lines. Line amount is derived as quantity times the snapshot unit price; no duplicated line-total column is proposed. All units on a line share options and combo choices; different choices require separate lines. Historical displays use snapshots, while item-level reporting joins through the retained size record. Instructions are retained under BR-08.

## 7. `order_line_components`

Stores the two half-order selections for a G1 Combination Plate without separately charging for them.

| Column | Type | Keys | Nullable | Description |
|---|---|---|---|---|
| `id` | `uuid` | PK | No | Identifies a combination selection. |
| `order_line_id` | `uuid` | FK → `order_lines.id`; part of UQ | No | Identifies the parent Combination Plate line. |
| `component_position` | `smallint` | Part of UQ | No | Identifies the first or second half using value `1` or `2`. |
| `menu_item_id` | `uuid` | FK → `menu_items.id` | No | Identifies the selected entrée from G2–G10. |
| `item_name_snapshot` | `text` | — | No | Preserves the selected half's item name as ordered. |

Rules: unique `(order_line_id, component_position)`; exactly two rows for each G1 line and none for other lines. Each row is one half per parent unit, so quantity belongs to the parent line. The G1 size price covers both halves. Parent-item eligibility and exact row count require future transactional validation, beyond FK cardinality. No uniqueness rule on the selected item is added. G7/G8 do not exist; choose from the existing G2–G10 codes without renumbering.

## 8. `payments`

Associates an order with its single Stripe Checkout session and optional payment-intent reference.

| Column | Type | Keys | Nullable | Description |
|---|---|---|---|---|
| `id` | `uuid` | PK | No | Identifies the payment association. |
| `order_id` | `uuid` | FK → `orders.id`; UQ | No | Associates the payment session with exactly one order. |
| `stripe_checkout_session_id` | `text` | UQ | No | Records the unique Stripe session used to make webhook retries idempotent. |
| `stripe_payment_intent_id` | `text` | UQ | Yes | Records the Stripe payment intent when it becomes available. |
| `amount_cents` | `integer` | — | No | Records the expected session amount in cents for confirmation checks. |
| `currency` | `text` | — | No | Records the payment currency, proposed fixed value `usd` for this project. |
| `paid_at` | `timestamptz` | — | Yes | Records verified payment confirmation time, with null while awaiting payment. |
| `created_at` | `timestamptz` | — | No | Records when the session association was saved. |

Rules: one Stripe session per order; `payments.order_id` is unique, preserving the zero-or-one relationship while a session is being created. Unique session references prevent duplicate associations; nullable intent references are unique when present. Amount must match the order total and currency before confirming payment. Verified webhook processing updates payment and order atomically and safely handles duplicate delivery; constraints alone are not the full idempotency design. No card numbers, security codes, passwords, or secret keys are stored. Abandoned checkout expires; retrying creates a new order/session rather than replacing the old session. Refunds are issued in Stripe's dashboard, then the owner marks the ticket cancelled.

## 9. `order_status_log`

Records payment and ticket state transitions with their timestamp and optional authenticated actor.

| Column | Type | Keys | Nullable | Description |
|---|---|---|---|---|
| `id` | `uuid` | PK | No | Identifies a status event. |
| `order_id` | `uuid` | FK → `orders.id` | No | Identifies the order whose status changed. |
| `status_kind` | `text` | — | No | Selects the `payment` or `ticket` status domain for this event. |
| `from_status` | `text` | — | Yes | Records the previous domain value, with null for its initial state. |
| `to_status` | `text` | — | No | Records the new value in the selected status domain. |
| `changed_by` | `uuid` | FK → `staff_users.id` | Yes | Records the staff or owner actor, with null for system or webhook events. |
| `changed_at` | `timestamptz` | — | No | Records the transition time. |

Rules: validate status values against `status_kind`, using the same payment/ticket values as orders, and record both transitions when payment confirmation opens a ticket. Initial payment can log `null → pending_payment`, and first ticket status logs `null → received`. Owner cancellation logs a final ticket transition to `cancelled`; it does not change payment to a cancelled/refunded value. Append logs atomically with actual state changes; duplicate webhook delivery must not append duplicate transitions.

## 10. `staff_users`

Assigns an application role to a Supabase-authenticated staff or owner account.

| Column | Type | Keys | Nullable | Description |
|---|---|---|---|---|
| `id` | `uuid` | PK; FK → `auth.users.id` | No | Reuses the authenticated Supabase user's identifier. |
| `role` | `text` | — | No | Grants the application role `staff` or `owner`. |

Rules: one optional role row per Auth user; no customer role, password, or credential column. Role assignment is controlled by trusted administration, not self-service edits. Retain referenced identities for audit history. The role name is `staff`, not `kitchen`; `auth.users` is externally managed by Supabase and is not one of the 12 application tables.

## 11. `business_hours`

Stores a weekly opening interval per local day independently of tax and lead-time settings.

| Column | Type | Keys | Nullable | Description |
|---|---|---|---|---|
| `day_of_week` | `smallint` | PK | No | Identifies the local weekday using proposed convention `0 = Sunday` through `6 = Saturday`. |
| `opens_at` | `time` | — | Yes | Records local opening time, with null on a closed day. |
| `closes_at` | `time` | — | Yes | Records local closing time, with null on a closed day. |

Proposed representation: seven rows, Sunday with both times null and Monday–Saturday with `11:00`/`21:00`. Check weekday range and require either both times null or both present with opening before closing. This model supports one same-day interval, matching the documented hours; holiday exceptions and split or overnight hours are outside the present proposal.

## 12. `settings`

Stores a singleton configuration record for checkout tax, lead times, and local time interpretation.

| Column | Type | Keys | Nullable | Description |
|---|---|---|---|---|
| `id` | `smallint` | PK | No | Identifies the sole settings record, proposed enforced value `1`. |
| `tax_rate` | `numeric(7,6)` | — | No | Holds the current tax fraction, documented as `0.0825` for 8.25%. |
| `regular_lead_minutes` | `integer` | — | No | Holds the regular minimum lead time, currently `15` minutes. |
| `catering_lead_minutes` | `integer` | — | No | Holds the catering minimum lead time, currently `40` minutes. |
| `timezone` | `text` | — | No | Holds the restaurant's local zone, proposed value `America/Chicago`. |

Proposed rules: only row `1`, tax fraction between `0` and `1`, positive lead times, and a valid supported time zone. The singleton must exist before checkout. Configuration changes affect future checkouts; stored order snapshots remain unchanged. No FK from orders to settings is needed because orders retain the applicable historical facts.

## Approval and implementation handoff

Charles can use the matching [Mermaid ERD](erd.md) to redraw the official diagram in Visio. These files are prepared for that handoff; no message has been sent to Charles.

Final decisions from Charles's summary and Hiab's review:

- BR-08 keeps `order_lines.instructions`; BR-20, BR-23 and BR-26 are kept and add no columns.
- BR-24 requires retaining orders for at least six months. This is a minimum, not a deletion date; add no cleanup job, and never hard-delete referenced menu data.
- Payment values are `pending_payment`, `paid`, `expired`; ticket values are `received`, `in_progress`, `ready`, `completed`, final owner-only `cancelled`. Refunds stay in Stripe; reports exclude cancelled tickets.
- `item_sizes.price_cents` and `order_lines.unit_price_cents` must be greater than zero through CHECK constraints.
- One Stripe session per order, with unique `payments.order_id`. An abandoned order expires; retrying creates a new order.
- Email is required and phone optional. G7/G8 are intentional gaps. Tax rate remains a decimal fraction, `numeric(7,6)`, in settings and orders.
- Use the words `completed` and `staff`, not `closed` and `kitchen`, for stored status and role values.

Only two design items remain open:

1. **Display order number format** — a running number such as `#0042` is proposed; Hiab must confirm its format/allocation.
2. **Sold-out level** — item versus size availability needs sponsor confirmation; item-level availability is the working model.

Quincy's change log must reconcile **F8** (name and required email, optional phone) and **F16** (add `completed` and owner-only `cancelled`). Other explicitly relevant requirements in the supplied guidance are **F14** (display order number), **F15** (paid orders reach the shared kitchen/counter view within five seconds), **F27** (temporary availability), and non-functional **4.02** (payment retry reliability). Documentation supports these requirements; it does not implement or prove them.

After the ERD gate, T23 can define migrations, constraints, indexes, triggers, and RLS. All tables require RLS: public reads expose orderable menu data; menu, size, and settings writes require owner authorization; orders and lines are readable by staff/owner; ticket updates require staff/owner authorization. Policies for components, payments, logs, hours, and role records must also be specified, with guest checkout and webhook writes mediated by trusted server code. Guest confirmation access needs a scoped design rather than public order reads. Future indexes include `orders.created_at`, `orders.ticket_status`, and `order_lines.order_id`; role protection and allowed-column updates must be enforced as well as row visibility. None of that implementation is performed in W2.
