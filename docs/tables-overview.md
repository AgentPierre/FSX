# Tables overview — W2 support (T14/T15)

Prepared by Perry for Charles, 7 Oct 2026. **Draft for the 12 Oct ERD approval gate; not an approved schema or a migration.** T23 remains blocked until approval. The matching diagram is in [erd.md](erd.md).

Sources: [CLAUDE.md](../CLAUDE.md), the W2 prompt in [PERRY.md](PERRY.md), and [erd-review-and-answers.md](erd-review-and-answers.md). The review supplies entity-level decisions, not a complete column dictionary. The columns below form a concrete proposed dictionary for Charles to review; UUID keys, audit fields, naming, defaults, and additional snapshots are design proposals wherever the sources do not prescribe them.

## Conventions and decisions

- PostgreSQL types are used. `timestamptz` stores instants; business-hour `time` values and reporting days are interpreted in `America/Chicago`. No money uses floating point: all amounts and unit prices are integer cents. Tax rate is a decimal fraction (`0.0825` for the currently documented 8.25%), not money.
- `PK` = primary key; `FK` = foreign key; `UQ` = unique. `—` means no key. Every row below explicitly states nullability. Proposed UUID PKs are server-generated, and timestamps are server-set.
- Prices belong exclusively to `item_sizes`; an unsized item has one `regular` size. Menu availability and archival are independent flags. Item-level availability is the current working assumption, pending sponsor confirmation about individual sizes selling out.
- Historical orders retain names, size labels, unit prices, tax rate, and totals. Never hard-delete menu data referenced by historical lines, combo components, or price history. Extra size/component name snapshots below extend the review's item-name snapshot principle and need Charles's agreement.
- Customers are guests: no customer table. A ticket is a paid order: no ticket table. `staff_users` contains roles only; Supabase Auth owns credentials.
- This is a column-complete proposal for these 12 application tables, not a claim that the five missing business rules have been approved. No SQL, migrations, seeds, triggers, or database changes are included.

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

Rules: unique `(menu_item_id, size_code)`; nonnegative price. Unsized items use `regular`, rice uses `sm`/`lg`, and trays use `S`/`M`/`L`. Each orderable item needs at least one size, enforced during future menu writes. Size-level availability is deliberately an open decision rather than a second assumed flag.

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

Proposed rules: prices are nonnegative and differ; log actual updates, not initial insertion. A null actor means a system action, not permission for an anonymous price edit. Future T23 work will define the trigger and secure actor attribution.

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
| `payment_status` | `text` | — | No | Records `pending_payment`, `paid`, `refunded`, or `cancelled`, initially `pending_payment`. |
| `ticket_status` | `text` | — | Yes | Records `received`, `in_progress`, `ready`, or `completed`, and is initially null. |
| `subtotal_cents` | `integer` | — | No | Snapshots the server-calculated sum of line unit prices times quantities. |
| `tax_rate` | `numeric(7,6)` | — | No | Snapshots the tax fraction applied to this order. |
| `tax_cents` | `integer` | — | No | Snapshots the tax amount rounded to integer cents at checkout. |
| `total_cents` | `integer` | — | No | Snapshots the payable amount as subtotal plus tax. |
| `email_sent_at` | `timestamptz` | — | Yes | Records successful dispatch of the one order-ready email, with null meaning not yet sent. |
| `created_at` | `timestamptz` | — | No | Records when the pending checkout was created. |
| `updated_at` | `timestamptz` | — | No | Records the latest order update. |

Rules and proposals:

- The source requires display numbers unique at least per day. This draft proposes global uniqueness for simpler pickup lookup; Charles must choose the format and allocation method, including collision handling. A date-prefixed sequence is one possible format, not an approved choice.
- `pending_payment` always implies null `ticket_status`; an unpaid cancellation also stays null. Only verified payment confirmation can introduce `received`. A refund after payment may retain the historical ticket state; do not erase fulfillment history or invent a refunded ticket state. Precise refund/cancellation transitions remain to be agreed.
- The cashier/counter or owner advances tickets through `received → in_progress → ready → completed`; a no-show remains ready until the owner closes it.
- The server recalculates all prices. Amounts are nonnegative, `total_cents = subtotal_cents + tax_cents`, and tax rate is between `0` and `1`. This draft proposes rounding tax once on the subtotal; rounding policy still needs confirmation.
- Selected pickup must be at or after the stored earliest pickup and satisfy business hours. Regular orders require at least 15 minutes, catering orders at least 40, and mixed orders take the longer lead time, using settings at checkout.
- Historical totals and tax rate are immutable after checkout; refunds do not rewrite the original sale. Reports are labeled **Online orders only**; gross/net refund reporting and revenue timestamp policy remain open.

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

Rules: quantity is positive and price nonnegative. Line amount is derived as quantity times the snapshot unit price; no duplicated line-total column is proposed. All units on a line share options and combo choices; different choices require separate lines. Historical displays use snapshots, while item-level reporting joins through the retained size record.

## 7. `order_line_components`

Stores the two half-order selections for a G1 Combination Plate without separately charging for them.

| Column | Type | Keys | Nullable | Description |
|---|---|---|---|---|
| `id` | `uuid` | PK | No | Identifies a combination selection. |
| `order_line_id` | `uuid` | FK → `order_lines.id`; part of UQ | No | Identifies the parent Combination Plate line. |
| `component_position` | `smallint` | Part of UQ | No | Identifies the first or second half using value `1` or `2`. |
| `menu_item_id` | `uuid` | FK → `menu_items.id` | No | Identifies the selected entrée from G2–G10. |
| `item_name_snapshot` | `text` | — | No | Preserves the selected half's item name as ordered. |

Rules: unique `(order_line_id, component_position)`; exactly two rows for each G1 line and none for other lines. Each row is one half per parent unit, so quantity belongs to the parent line. The G1 size price covers both halves. Parent-item eligibility and exact row count require future transactional validation, beyond FK cardinality. Whether both halves may select the same entrée is unresolved; this draft does not add a uniqueness rule on the selected item.

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

Rules: an order has zero or one payment row because order creation precedes Stripe session creation. Unique order and session references prevent duplicate associations; nullable intent references are unique when present. Amount must match the order total and currency before confirming payment. Verified webhook processing updates payment and order atomically and safely handles duplicate delivery; constraints alone are not the full idempotency design. No card numbers, security codes, passwords, or secret keys are stored. Refunds are issued in Stripe's dashboard; synchronization details need later design. Replacing an expired session or supporting multiple attempts would require revisiting this one-session proposal.

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

Proposed rules: validate status values against `status_kind` and record both transitions when payment confirmation also opens a ticket. Initial payment can log `null → pending_payment`, and first ticket status logs `null → received`. Append logs atomically with actual state changes; duplicate webhook delivery must not append duplicate transitions.

## 10. `staff_users`

Assigns an application role to a Supabase-authenticated staff or owner account.

| Column | Type | Keys | Nullable | Description |
|---|---|---|---|---|
| `id` | `uuid` | PK; FK → `auth.users.id` | No | Reuses the authenticated Supabase user's identifier. |
| `role` | `text` | — | No | Grants the application role `staff` or `owner`. |

Rules: one optional role row per Auth user; no customer role, password, or credential column. Role assignment is controlled by trusted administration, not self-service edits. Retain referenced identities for audit history; account-deletion behavior needs approval before migrations. `auth.users` is externally managed by Supabase and is not one of the 12 application tables.

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
| `tax_rate` | `numeric(7,6)` | — | No | Holds the current tax fraction, documented as `0.0825` pending receipt confirmation. |
| `regular_lead_minutes` | `integer` | — | No | Holds the regular minimum lead time, currently `15` minutes. |
| `catering_lead_minutes` | `integer` | — | No | Holds the catering minimum lead time, currently `40` minutes. |
| `timezone` | `text` | — | No | Holds the restaurant's local zone, proposed value `America/Chicago`. |

Proposed rules: only row `1`, tax fraction between `0` and `1`, positive lead times, and a valid supported time zone. The singleton must exist before checkout. Configuration changes affect future checkouts; stored order snapshots remain unchanged. No FK from orders to settings is needed because orders retain the applicable historical facts.

## Approval and implementation handoff

Charles can use the matching [Mermaid ERD](erd.md) to redraw the official diagram in Visio. These files are prepared for that handoff; no message has been sent to Charles.

Before approval, obtain the missing text and decisions for **BR-08, BR-20, BR-23, BR-24, and BR-26**. Do not infer their contents. Confirm availability level, display-number allocation, proposed snapshot/audit columns, the status-log representation, settings and weekday conventions, tax rounding, combo duplicate selections, payment-session retry handling, and refund/reporting policy. The menu CSV currently omits G7/G8 even though the combo eligibility rule names G2–G10; reconcile the authoritative menu before T23 seeding.

Quincy's change log must reconcile **F8** (name and required email, optional phone) and **F16** (add `completed`). Other explicitly relevant requirements in the supplied guidance are **F14** (display order number), **F15** (paid orders reach the shared kitchen/counter view within five seconds), **F27** (temporary availability), and non-functional **4.02** (payment retry reliability). Documentation supports these requirements; it does not implement or prove them.

After the ERD gate, T23 can define migrations, constraints, indexes, triggers, and RLS. All tables require RLS: public reads expose orderable menu data; menu, size, and settings writes require owner authorization; orders and lines are readable by staff/owner; ticket updates require staff/owner authorization. Policies for components, payments, logs, hours, and role records must also be specified, with guest checkout and webhook writes mediated by trusted server code. Guest confirmation access needs a scoped design rather than public order reads. Future indexes include `orders.created_at`, `orders.ticket_status`, and `order_lines.order_id`; role protection and allowed-column updates must be enforced as well as row visibility. None of that implementation is performed in W2.
