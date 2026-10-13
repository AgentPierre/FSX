# Tables overview — final ERD implementation (T23 / SCRUM-62)

Prepared by Perry Takyi; updated 12 Oct 2026 to implement Charles's final ERD decisions supplied for T23. The matching diagram is in [erd.md](erd.md), and the application instructions are in [database-setup.md](database-setup.md). This documents the migration; it does not claim the hosted database has been deployed.

Sources: [CLAUDE.md](../CLAUDE.md), [PERRY.md](PERRY.md), [erd-review-and-answers.md](erd-review-and-answers.md), and Charles's summary in `docs/erd/Team09-ERD-Summary (Hiab edits).docx`. Perry's T23 instructions and Charles's updated summary supersede the older payment and ticket values in CLAUDE.md and the application stubs. All 81 columns match the updated summary.

## Conventions and decisions

- PostgreSQL types are used. `timestamptz` stores instants; business-hour `time` values and reporting days are interpreted in `America/Chicago`. No money uses floating point: all amounts and unit prices are integer cents. Tax rate is a decimal fraction (`0.0825` for the currently documented 8.25%), not money.
- `PK` = primary key; `FK` = foreign key; `UQ` = unique. `—` means no key. Every row below explicitly states nullability. Proposed UUID PKs are server-generated, and timestamps are server-set.
- Prices belong exclusively to `item_sizes`; an unsized item has one `regular` size. Menu availability and archival are independent flags. Item-level availability is the current working assumption, pending sponsor confirmation about individual sizes selling out.
- Historical orders retain names, size labels, unit prices, tax rate, and totals. Never hard-delete menu data referenced by historical lines, combo components, or price history. Size and component name snapshots match Charles's updated column dictionary.
- Customers are guests: no customer table. A ticket is a paid order: no ticket table. `staff_users` contains roles only; Supabase Auth owns credentials.
- The T23 migration creates these 12 application tables, constraints, indexes, triggers and RLS together. `supabase/seed.sql` loads the menu CSV and restaurant configuration; staff identities are not seeded. No retention cleanup job is added: BR-24 specifies a minimum of six months, not an automatic deletion date.

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

Rules: unique `(menu_item_id, size_code)` and `CHECK (price_cents > 0)`; there are no free sizes or separately priced combo halves. Unsized items use `regular`, rice uses `sm`/`lg`, and trays use `S`/`M`/`L`. Each orderable item needs at least one size, validated by backend menu writes. Size-level availability remains a sponsor question; the implemented model uses item-level availability.

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

Rules: old and new prices are positive and differ; the trigger logs actual updates, not initial insertion or no-op updates. `changed_by` is taken from Supabase Auth when it resolves to a staff identity; null denotes a system action. Clients cannot insert, update or delete audit records.

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
| `ticket_status` | `text` | — | Yes | Records `received`, `in_progress`, `ready`, `completed`, or owner-only `cancelled`, and is initially null. |
| `subtotal_cents` | `integer` | — | No | Snapshots the server-calculated sum of line unit prices times quantities. |
| `tax_rate` | `numeric(7,6)` | — | No | Snapshots the tax fraction applied to this order. |
| `tax_cents` | `integer` | — | No | Snapshots the tax amount rounded to integer cents at checkout. |
| `total_cents` | `integer` | — | No | Snapshots the payable amount as subtotal plus tax. |
| `email_sent_at` | `timestamptz` | — | Yes | Records successful dispatch of the one order-ready email, with null meaning not yet sent. |
| `created_at` | `timestamptz` | — | No | Records when the pending checkout was created. |
| `updated_at` | `timestamptz` | — | No | Records the latest order update. |

Rules and proposals:

- The source requires display numbers unique at least per day. This draft proposes global uniqueness for simpler pickup lookup; Charles must choose the format and allocation method, including collision handling. A date-prefixed sequence is one possible format, not an approved choice.
- Status-value CHECKs constrain payment to `pending_payment`, `paid`, `expired` and tickets to `received`, `in_progress`, `ready`, `completed`, `cancelled`. The exact invariant is `CHECK (ticket_status IS NULL OR payment_status = 'paid')`; both pending and expired checkouts have no ticket.
- Orders start pending. Trusted payment handling can change pending to paid (opening a received ticket in the same update) or expired. A retry uses a new order and session; an expired order cannot become paid.
- The cashier/counter or owner advances `received → in_progress → ready → completed`. Only the owner may set `cancelled`, including after a Stripe refund; payment remains paid. A no-show stays ready until the owner marks it cancelled. The trigger enforces normal progression and prevents staff cancellation.
- The server recalculates all prices. Amounts are nonnegative, `total_cents = subtotal_cents + tax_cents`, and tax rate is between `0` and `1`. This draft proposes rounding tax once on the subtotal; rounding policy still needs confirmation.
- Selected pickup must be at or after the stored earliest pickup and satisfy business hours. Regular orders require at least 15 minutes, catering orders at least 40, and mixed orders take the longer lead time, using settings at checkout.
- Historical totals and tax rate are not editable by staff or owner client requests; refunds do not rewrite the original sale. Reports are labeled **Online orders only** and exclude cancelled tickets (BR-25). Refund processing stays in Stripe, outside this schema; no `refunded` payment value exists.

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

Rules: `CHECK (quantity > 0)` and `CHECK (unit_price_cents > 0)`. Line amount is derived as quantity times the snapshot unit price; no duplicated line-total column is stored. All units on a line share options and combo choices; different choices require separate lines. Historical displays use snapshots, while item-level reporting joins through the retained size record. The nullable `instructions` column is retained under BR-08.

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

Rules: an order has zero or one payment row because order creation precedes Stripe session creation. `payments.order_id` and the Stripe session ID are each unique; nullable intent references are unique when present. One order gets one session: abandoned checkout becomes expired and a retry creates a new order. Backend confirmation must verify amount, currency and signature and update payment/order atomically; uniqueness alone is not the full webhook implementation. No card numbers, security codes, passwords, or secret keys are stored. Refunds are issued in Stripe's dashboard, followed by an owner ticket cancellation in this application.

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

Rules: status-value CHECKs validate `from_status` and `to_status` against `status_kind`, with the same payment and ticket values as orders. The order trigger records initial `null → pending_payment` and both changes when payment opens a ticket. Logs are appended atomically with actual state changes; repeating identical values adds no duplicate event. Null prior state is allowed, but new state is required.

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

## Implementation and backend handoff

The migration and diagram follow Charles's updated column dictionary and the explicit T23 decisions. The database remains unapplied until the team reviews the PR and runs the documented Supabase commands. Availability stays at item level; display order numbers are required and globally unique, with format/allocation left to the backend rather than an invented schema column.

Charles's summary keeps BR-08 (instructions), BR-20, BR-23 and BR-26; the latter three do not add columns. BR-24 is a six-month minimum retention policy. G7 and G8 do not exist on the printed menu and are intentionally absent. Do not invent or renumber them. Both halves selecting the same existing entrée remain permitted by this schema; the sponsor can clarify that checkout rule without changing these columns.

Quincy's change log must reconcile **F8** (required name/email, optional phone) and **F16** (completed and owner-only cancelled). Related requirements include **F14** (display order number), **F15** (paid kitchen tickets), **F27** (temporary availability), and non-functional **4.02** (payment retry reliability). Realtime publication includes orders when the Supabase publication exists; the five-second UI requirement still needs end-to-end verification.

All 12 tables enable RLS in their creation migration. Public clients read categories, available active menu items and their sizes, hours, and settings. Staff/owner can also read archived menu data and order/line/component/status history; payments and price history are owner-readable. Only owners insert/update menu, sizes, hours and settings; client deletes are disabled. Authenticated clients can update only `orders.ticket_status`, with paid-order RLS and an owner-only cancellation guard. Each identity can read only its own role; role provisioning and checkout/payment writes use trusted server administration. No public customer-order reads are granted.

Private audit trigger functions have a fixed empty search path and no client EXECUTE grants; their narrow definer privilege allows audit inserts without granting clients log-write access. The role helper is an invoker function using a nonrecursive own-role RLS policy. Required timestamp, ticket and line-order indexes and FK lookup indexes are included.

The existing backend still uses stubs. SCRUM-64/T25 integration must map `numeric(7,6)` fractions to the app's basis points, align TypeScript statuses, validate prices and pickup rules server-side, create complete orders transactionally, validate exactly two eligible combo selections, allocate readable order numbers, authenticate owner cancellation, and scope guest confirmation access. FK cardinality alone cannot enforce an order's minimum line count or conditional combo count. These are explicit backend responsibilities, not proof supplied by the schema migration.
