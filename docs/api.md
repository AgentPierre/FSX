# API Contract (T25)

Status: **draft against in-memory stubs.** The schema is not approved until 12 Oct; every route
reads and writes through the `DataStore` interface in `lib/data/store.ts`, so swapping the stub for
Supabase changes one file. Covers RTM F3–F6, F8–F13 and F16 at the API level. F14 (confirmation
number) is covered by `POST /api/orders` returning the order number and the `/order/[id]` page
showing it (T30). F15 (kitchen view within 5 seconds) and F17–F30 are not covered.

Conventions

- Money is **integer cents**. Every price is recomputed server-side; any price in a request body is ignored.
- Times are ISO 8601 instants (UTC). Business rules are evaluated in `America/Chicago`.
- Errors are always `{ "error": { "code": string, "message": string, "details"?: object } }`.
- Statuses live in two columns (final ERD, 12 Oct): `payment_status` (`pending_payment` → `paid`, or
  `expired` when checkout is abandoned) and `ticket_status` (`null` → `received` → `in_progress` → `ready`
  → `completed`, or `cancelled`, owner only). There is no `refunded`: the owner refunds in Stripe's
  dashboard and then marks the order cancelled (BR-29, BR-30).
- Every audience gets its own view of an order (BR-20): customer = `PublicOrder`, kitchen = `KitchenTicket`
  (no email, phone, money or Stripe ids), owner = `OwnerOrder`. Defined in `lib/views.ts` and
  `lib/public-order.ts`. Never return a raw `Order`.

## GET menu (not an HTTP route)

`getMenu()` in `lib/data`, called from the server component at `/menu`. Returns categories ordered by
`sortOrder`, each with items (`isActive` only), each with sizes (price in cents on the size row).
Unsized items have one size named `regular`. `isAvailable=false` items are returned flagged so the UI can show "sold out".

## POST /api/orders

Creates an order in `pending_payment` and a Stripe Checkout Session.

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
    { "sizeId": "sz_r1_lg", "quantity": 1, "spicy": false, "instructions": "" },
    { "sizeId": "sz_g1", "quantity": 1, "components": ["G2", "G5"] }
  ]
}
```

- `customer.name` and `customer.email` required; `phone` optional (RTM F8 correction pending).
- `components` required for G1 (exactly two codes from G2–G10, repeats allowed), forbidden elsewhere.
- `quantity` 1–50. `instructions` max 200 chars.

Server steps: validate → check business hours → recompute prices → lead time = max of lines
(15 min regular, 40 min catering) → `pickupTime` must be ≥ now + lead and inside that day's hours →
insert order → create Stripe session (`client_reference_id` = order id) → store session id.

201 response

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
(details.earliestPickup), `422 pickup_outside_hours`, `502 stripe_error` (order is set to `expired`),
`503 stripe_not_configured`.

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
- `checkout.session.expired` (customer left checkout; sessions last 30 minutes) → the order whose saved
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
sets `completed`. `cancelled` is allowed from `received`, `in_progress` or `ready` for the **owner only**
(BR-29, e.g. no-shows); it is final. An order that is not `paid` has `ticket_status=null` and is rejected.
Errors: `400 invalid_request`, `401 unauthenticated`, `403 forbidden` (a kitchen user asking for `cancelled`),
`404 not_found`, `409 invalid_transition` (details.from/to/allowed), `409 not_paid`.

Auth is stubbed (`lib/auth.ts`): a dev-only `x-stub-role: staff|owner` header, **refused in production**.
Replaced by Supabase Auth + `staff_users.role` once the schema lands.

## POST /api/dev/seed (development only)

Fills the in-memory stub with five paid orders in different ticket states so the kitchen board and owner pages
can be built without Stripe. Returns `404` in production. Delete when the Supabase store replaces the stub.

## Open questions

- Order-number format (daily sequence vs short code) — ERD decision.
- Sold-out at item vs size level — modelled at item level for now.
- Email on `ready` (Resend or similar) — not part of this contract until the dependency is approved.
- Request validation uses `zod` (approved by the dev lead as a new dependency, 7 Oct).
