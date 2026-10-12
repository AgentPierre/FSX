# API Contract (T25)

Status: **draft against in-memory stubs.** The schema is not approved until 12 Oct; every route
reads and writes through the `DataStore` interface in `lib/data/store.ts`, so swapping the stub for
Supabase changes one file. Covers RTM F3–F6, F8–F13 and F16 at the API level. F14 (confirmation
number) is only partly covered here: `POST /api/orders` returns the order number, and the confirmation
page that displays it is T30. F15 (kitchen view within 5 seconds) and F17–F30 are not covered.

Conventions

- Money is **integer cents**. Every price is recomputed server-side; any price in a request body is ignored.
- Times are ISO 8601 instants (UTC). Business rules are evaluated in `America/Chicago`.
- Errors are always `{ "error": { "code": string, "message": string, "details"?: object } }`.
- Statuses live in two columns: `payment_status` (`pending_payment` → `paid` → `refunded`/`cancelled`) and
  `ticket_status` (`null` → `received` → `in_progress` → `ready` → `completed`).

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
(details.earliestPickup), `422 pickup_outside_hours`, `502 stripe_error` (order is cancelled),
`503 stripe_not_configured`.

## POST /api/webhooks/stripe

Reads the **raw** body, verifies `Stripe-Signature` with `STRIPE_WEBHOOK_SECRET`.

- `checkout.session.completed` (with `payment_status=paid`) or `checkout.session.async_payment_succeeded`
  → set `payment_status=paid`, `ticket_status=received`, record the payment.
- Only flips an order that is still `pending_payment` **and** whose saved Stripe session id matches the
  event's session. A cancelled or refunded order is never revived; that case is logged for the owner.
- Idempotent: a repeat delivery for the same session is a no-op `200`.
- Sessions carry `metadata.site`; events for sessions created by another environment (teammates share
  the Stripe test account) are ignored with `200`.
- Order not found → `500 order_not_found`, so Stripe retries (up to 3 days) instead of the payment being lost.
- `amount_total` ≠ order total → **not** marked paid; logged, `200` (a retry would not help).
- `checkout.session.async_payment_failed` → logged; order stays `pending_payment`.
- Other event types: `200`, ignored. Bad signature: `400 invalid_signature`.

This is the only place an order becomes paid.

## PATCH /api/orders/{id}/ticket

Body `{ "status": "in_progress" }`. Roles `staff` or `owner` only.
Allowed sequence: `received → in_progress → ready → completed`; no skipping, no going back.
The cashier/counter sets `completed`. An order that is not `paid` has `ticket_status=null` and is rejected.
Errors: `400 invalid_request`, `401 unauthenticated`, `403 forbidden`, `404 not_found`,
`409 invalid_transition` (details.from/to/allowed), `409 not_paid`.

Auth is stubbed (`lib/auth.ts`): a dev-only `x-stub-role` header, **refused in production**.
Replaced by Supabase Auth + `staff_users.role` once the schema lands.

## Open questions

- Order-number format (daily sequence vs short code) — ERD decision.
- Sold-out at item vs size level — modelled at item level for now.
- Email on `ready` (Resend or similar) — not part of this contract until the dependency is approved.
- Request validation uses `zod` (approved by the dev lead as a new dependency, 7 Oct).
