# API Contract (T25 / T30)

Status: **Supabase-backed implementation; acceptance testing in progress.** The T23 tables/menu
and T25 transactional checkout RPCs are deployed. Every route uses the `DataStore` interface in
`lib/data/store.ts`; Supabase is the default and `FSX_DATA_SOURCE=stub` selects local-only fixtures.
Covers RTM F3–F6, F8–F13 and F16 at the API level. F14 (confirmation
number) is covered by `POST /api/orders` returning the order number and the `/order/[id]` page
showing it (T30). F15 (kitchen view within 5 seconds) and F17–F30 are not covered.

Conventions

- Money is **integer cents**. Every price is recomputed server-side; any price in a request body is ignored.
- Times are ISO 8601 instants (UTC). Business rules are evaluated in `America/Chicago`.
- Errors are always `{ "error": { "code": string, "message": string, "details"?: object } }`.
- JSON mutation routes using `parseBody` (order submission and ticket updates) require
  `Content-Type: application/json` and valid UTF-8. Bodies are limited to **64 KiB**; actual
  streamed bytes are counted, so omitting or understating `Content-Length` cannot bypass the limit.
  Unsupported media types return `415 unsupported_media_type`; oversized bodies return
  `413 payload_too_large`. Stripe webhooks keep their separate raw-body signature path.
- Statuses live in two columns (final ERD, 12 Oct): `payment_status` (`pending_payment` → `paid`, or
  `expired` when checkout is abandoned) and `ticket_status` (`null` → `received` → `in_progress` → `ready`
  → `completed`, or `cancelled`, owner only). There is no `refunded`: the owner refunds in Stripe's
  dashboard and then marks the order cancelled (BR-29, BR-30).
- Every audience gets its own view of an order (BR-20): customer = `PublicOrder`, kitchen = `KitchenTicket`
  (no email, phone, money or Stripe ids), owner = `OwnerOrder`. Defined in `lib/views.ts` and
  `lib/public-order.ts`. Never return a raw `Order`.

## GET /api/menu

Public, read-only. Returns `200 { "categories": MenuCategory[] }`, categories ordered by
`sortOrder`, each with items (`isActive` only), each with sizes (price in cents on the size row).
Unsized items have one size named `regular`. `isAvailable=false` items are returned flagged so the UI can show "sold out".
`Cache-Control: no-store` keeps prices and availability fresh. Database failures return the standard
error envelope with `503 database_unavailable`, never silently substitute fixture data. The `/menu`
server component can still call `getMenu()` directly; a server component does not need to make an
HTTP request to its own application.

## GET /api/users/me

Returns `200 { "role": "staff" }` or `200 { "role": "owner" }` for the currently signed-in team
account. Supabase Auth verifies the user, then `staff_users` supplies that user's role. No names,
email addresses, tokens or other users are returned. `Cache-Control: private, no-store` applies to
success and error responses. Errors: `401 unauthenticated`, `403 forbidden` for an unprovisioned
account, `503 auth_unavailable` if role lookup fails. Live mode ignores `x-stub-role`.

This is not a user-management API. Login/logout use Supabase Auth; trusted administrators provision
roles as described in [Supabase connection setup](supabase-connection.md#provisioning-temporary-test-accounts).
Public signup, user lists and client-side role assignment are not supported. Jose owns login UI
styling/accessibility under SCRUM-72.

## POST /api/orders

Creates an order in `pending_payment` and a Stripe Checkout Session. The public endpoint accepts
guest orders; it cannot accept a caller-provided price, paid status or kitchen status.

Request

```json
{
  "customer": {
    "name": "Ana",
    "email": "ana@example.com",
    "phone": "713-555-0100"
  },
  "pickupTime": "2026-10-20T18:30:00Z",
  "lines": [
    { "sizeId": "<R1-large-size-id-from-menu>", "quantity": 1, "spicy": false, "instructions": "" },
    { "sizeId": "<G1-size-id-from-menu>", "quantity": 1, "components": ["G2", "G5"] }
  ]
}
```

- `customer.name` and `customer.email` required; `phone` optional (RTM F8 correction pending).
- `sizeId` comes from `/api/menu`; live IDs are UUIDs, while local fixtures use their own IDs.
- `components` required for G1 (exactly two codes from G2–G6, G9, G10, repeats allowed), forbidden elsewhere. G7/G8 do not exist.
- `quantity` 1–50. `instructions` max 200 chars.
- `spicy: true` is only accepted on G, C and T items and fried rice R1–R6 (including steamed rice); on appetizers
  (including the wings), soups and drinks the server returns `400 invalid_request` ("… can't be made spicy").
  The rule lives in `lib/menu-rules.ts`, shared by the cart and the API.

Server steps: validate → check business hours → recompute prices → lead time = max of lines
(15 min regular, 40 min catering) → `pickupTime` must be ≥ now + lead and inside that day's hours →
insert order → create Stripe session (`client_reference_id` = order id) → store session id.

201 response, with `Location: /api/orders/{orderId}` and `Cache-Control: no-store`:

```json
{
  "orderId": "…",
  "orderNumber": "0042",
  "checkoutUrl": "https://checkout.stripe.com/…",
  "totalCents": 1425,
  "earliestPickup": "2026-10-20T18:15:00Z"
}
```

Errors: `400 invalid_request`, `409 store_closed`, `409 item_unavailable`, `422 pickup_too_early`
(details.earliestPickup), `422 pickup_outside_hours`, `413 payload_too_large`,
`415 unsupported_media_type`, `502 stripe_error`, `503 stripe_not_configured`,
`503 database_unavailable`. A price/availability change detected by the database transaction returns
`409 checkout_conflict` and rolls back creation. Success and failure responses use `Cache-Control: no-store`.

On a Stripe/session-attachment failure, the server attempts to expire any created session and the
pending order independently. Even if a cleanup attempt fails, the client gets a controlled 502
without a checkout URL. Safe server logs identify the order and failed stage for reconciliation;
they include only bounded identifier strings for `type`/`code` and a numeric HTTP `statusCode` when
present. They do not dump Stripe/SQL exception objects, messages, customer emails or submitted bodies. An attempted
cleanup is not a guarantee of expiry when Stripe or the database is unreachable. Check those
operational logs before treating a failed checkout as fully cleaned up.

## POST /api/webhooks/stripe

Reads the **raw** body, verifies `Stripe-Signature` with `STRIPE_WEBHOOK_SECRET`.

- `checkout.session.completed` (with `payment_status=paid`) or `checkout.session.async_payment_succeeded`
  → set `payment_status=paid`, `ticket_status=received`, record the payment.
- Only flips an order that is still `pending_payment` **and** whose saved Stripe session id matches the
  event's session. An expired order is never revived; that case is logged for the owner.
- Idempotent: a repeat delivery for the same session is a no-op `200`.
- Sessions carry `metadata.site`; events for sessions created by another environment (teammates share
  the Stripe test account) are ignored with `200`.
- Order not found → `500 order_not_found`, so Stripe retries (up to 3 days) instead of the payment being lost.
- `amount_total` ≠ order total → **not** marked paid; logged, `200` (a retry would not help).
- Currency must be `usd`. A missing saved session association returns `503 checkout_not_ready` so Stripe retries.
- `checkout.session.expired` (customer left checkout; sessions last 31 minutes) → the order whose saved
  session matches is set to `expired`. A paid order is never touched.
- `checkout.session.async_payment_failed` → logged; order stays `pending_payment`.
- Other event types: `200`, ignored. Bad signature: `400 invalid_signature`.

This is the only place an order becomes paid.

## GET /api/orders/{id}

Public order status for the confirmation page (the order id is an unguessable UUID). Returns
`id, orderNumber, paymentStatus, ticketStatus, pickupTime, subtotalCents, taxCents, totalCents, lines[]`
(each line includes the customer's own `instructions`).
Never returns email, phone or Stripe ids. `Cache-Control: no-store`. Errors: `404 not_found`.
The `/order/[id]` page polls this every 3 s while `pending_payment`, every 10 s until the ticket is
`completed` or `cancelled`, and stops when the order is `expired`.

## GET /api/staff/tickets

Kitchen and counter board. Roles `staff` or `owner`. Returns `{ "tickets": KitchenTicket[] }`: paid orders whose
ticket is `received`, `in_progress` or `ready`, **oldest paid first**. `completed` and `cancelled` tickets
leave the board. Each ticket has `id, orderNumber, customerName, ticketStatus, pickupTime, paidAt` and
`lines[]` (`name, sizeName, quantity, spicy, instructions, components`). `paidAt` drives the elapsed timer
and the "within 5 seconds" check. No email, phone, prices or Stripe ids. `Cache-Control: no-store`.
Errors: `401 unauthenticated`, `403 forbidden`. Realtime delivery comes with the Supabase store (T32/T37);
until then poll this endpoint.

## GET /api/owner/orders

Owner order history (T34). Role `owner` only. Paid orders, **newest first**. Query: `from`, `to` (ISO
instants, filter on `paidAt`, `to` exclusive), `status` (a ticket status), `q` (customer name or order
number), `page` (default 1), `pageSize` (default 25, max 100). Returns
`{ orders: OwnerOrder[], total, page, pageSize }`. An `OwnerOrder` adds `customerEmail, customerPhone,
paymentStatus, itemCount, subtotalCents, taxCents, totalCents, stripeSessionId` and per-line
`unitPriceCents`. Errors: `400 invalid_request`, `401`, `403`.

**Access model (accepted risk, signed off by the dev lead 12 Oct; note it in the security review, SCRUM-85):** guests have no accounts, so the link
`/order/{id}` is the credential, like a parcel-tracking link. The id is a random UUID v4 (122 random
bits), so it cannot be guessed or enumerated. What the link reveals is limited: order number, items,
the customer's own instructions, totals, pickup time and status. No name, email, phone or payment
details. Mitigations: `noindex`, `Referrer-Policy: no-referrer`, `Cache-Control: no-store`. If the
team wants a separate guest token instead, it needs a new column on `orders` (an ERD change).

## PATCH /api/orders/{id}/ticket

Body `{ "status": "in_progress" }`. Roles `staff` or `owner`.
Allowed: `received → in_progress → ready → completed`, one step at a time, no going back. The cashier/counter
sets `completed`. `cancelled` is allowed from `received`, `in_progress`, `ready` or `completed` for the **owner only**
(BR-29, e.g. no-shows or a refund after pickup); it is final. An order that is not `paid` has `ticket_status=null` and is rejected.
Errors: `400 invalid_request`, `401 unauthenticated`, `403 forbidden` (a kitchen user asking for `cancelled`),
`404 not_found`, `409 invalid_transition` (details.from/to/allowed), `409 not_paid`,
`413 payload_too_large`, `415 unsupported_media_type`.

Live Auth verifies Supabase users and reads `staff_users.role`. Ticket writes use the signed-in
session so RLS and audit attribution enforce owner-only cancellation. In explicitly selected local
stub mode only, `x-stub-role: staff|owner` is accepted. Stub mode is refused in production.

## POST /api/dev/seed (development only)

Fills the in-memory stub with five paid orders in different ticket states so the kitchen board and owner pages
can be built without Stripe. Returns `404` in production and whenever Supabase mode is selected.
Set `FSX_DATA_SOURCE=stub` locally to use it; it cannot insert demo rows in the live database.

## Open questions

- Order-number format is confirmed: a running number displayed as `#0042`, unique for all time; gaps are normal.
- Sold-out at item vs size level — modelled at item level for now.
- Email on `ready` (Resend or similar) — not part of this contract until the dependency is approved.
- Request validation uses `zod` (approved by the dev lead as a new dependency, 7 Oct).

## Design notes for SCRUM-64

The [Microsoft API design guidance](https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-design)
informs the resource URLs, HTTP methods, creation response and bounded history pagination here.
`POST /api/orders` creates a resource and returns 201 with its URI in `Location`; `GET` reads
resources without changing them; `PATCH` changes the ticket-status part of an existing order.
The existing error envelope is retained so teammates do not have to rewrite their clients.

Validate at trust boundaries: browser input is untrusted, the service recomputes prices and checks
business rules, and the database transaction rechecks authoritative rows before saving the whole
order. Authentication establishes identity; authorization checks the role's allowed actions.
Responses use audience-specific projections instead of exposing raw database rows.

A transaction cannot include a remote Stripe request. Session expiry after a failed attachment is
a compensating action: it attempts to undo the external side effect. It can also fail, so operations
must inspect the logged cleanup failure. Stripe webhook retries are a separate idempotency case:
repeated confirmation of the same saved session must not create duplicate payment/status updates.
The order-creation POST itself is not guaranteed idempotent across customer retries; Stripe's
per-order idempotency key does not deduplicate a second request that created a new order.

CI exercises real handlers with external boundaries replaced, plus disposable-database tests for
transactions/RLS. These checks do not replace the first Stripe test-mode checkout and role checks
on the dev deployment. Do not mark SCRUM-64 accepted until those checks are recorded.

T30 / SCRUM-69 adds submission tests that load the real JSON/Zod validator, business-rule service
and route together, replacing only storage and Stripe. They cover price/status tampering, contact
and quantity validation, availability, combo rules, mixed-order lead times, UTC normalization,
storage failure, request-size enforcement and cleanup failures. See
[order API testing](order-api-testing.md) for the test boundaries and acceptance steps.
