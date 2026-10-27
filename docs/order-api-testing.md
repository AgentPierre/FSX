# T30 / SCRUM-69 — Order submission and storage API

The task builds on the merged T25 backend and T40 checkout. Keep one submission path:

```text
POST /api/orders
  -> bounded UTF-8 JSON + shared Zod schema
  -> createPendingOrder: current menu, prices, hours, options and lead time
  -> DataStore.insertOrder: existing atomic database RPC
  -> Stripe Checkout through the installed Stripe SDK
  -> attach the session, then return 201 + Location
```

## Why these boundaries matter

An HTTP handler translates requests and responses. The service owns restaurant rules. The store
owns persistence. Keeping those responsibilities separate lets the same business rules run against
local fixtures or Supabase without duplicating the checkout logic.

The browser supplies choices and quantities, never authoritative prices, totals, snapshots or
statuses. Zod strips unknown properties; the service loads prices and names from the menu and
creates `pending_payment` / null-ticket records. Only the verified Stripe webhook marks paid.
Money remains integer cents, with tax calculated once on the subtotal.

The existing database RPC saves the order, lines and combo halves in one transaction. Its row locks
and price/name/total rechecks reject a concurrent menu change rather than saving inconsistent
snapshots. The T25 database tests exercise those database guarantees. This task does not change
the schema or apply a migration.

Stripe is outside the database transaction. If creating or attaching a session fails, session
expiry and order expiry are compensating actions, each of which can fail independently. The API
returns a controlled error and logs the order/stage for operations to reconcile. It never returns a
checkout URL from a failed setup. Avoid logging entire SDK exceptions: they can contain customer
information or request data.

The 64 KiB limit is enforced while reading bytes, before JSON parsing. A header-only limit would
miss chunked requests. `TextDecoder` handles UTF-8 split across chunks and rejects invalid encoding;
the native JSON parser and existing Zod schema do the parsing and field validation.

## CI coverage

The existing CI command `node --test "tests/*.test.mjs"` includes:

| Check | Expected behavior |
| --- | --- |
| Browser sends a false price, name, total or paid/ready status | Persist current server snapshots and pending/null status; Stripe uses server amounts |
| Missing contact, invalid quantity/date, too many lines or long instructions | 400 before persistence or Stripe |
| Closed store, sold-out/archived item, unknown size or disallowed spicy choice | Reject without saving or starting payment |
| Mixed regular/catering order | Require the longer 40-minute lead time; normalize offset timestamps to UTC |
| Combo choices | Exactly two existing allowed halves, repeats permitted; no G7/G8; no extra price lines |
| Database conflict/unavailability | Preserve 409/503; do not create a Stripe session |
| Wrong media type, malformed JSON or invalid UTF-8 | 415 or 400 before database reads |
| Oversized body, with absent or understated length | 413; stop reading the stream |
| Exactly 64 KiB or split UTF-8 | Decode correctly and continue normal validation |
| Session attachment and cleanup failures | Attempt compensating expiry; return 502; log safe order context |

These submission tests run real handlers/validation/business rules with a fixed test clock and
fake storage/Stripe boundaries. They create no hosted records and cannot charge a card. They do
not claim that a remote payment completed or that a database transaction was exercised by the
fake store. Database CI and the approved hosted acceptance test cover those separate boundaries.

## Safe local checks

Start the dev server as usual. These rejected requests cannot create orders or Stripe sessions:

```powershell
# Unsupported media type: expect 415 unsupported_media_type.
curl.exe -i http://localhost:3000/api/orders -H "Content-Type: text/plain" --data-raw '{}'

# Missing required fields: expect 400 invalid_request.
curl.exe -i http://localhost:3000/api/orders -H "Content-Type: application/json" --data-raw '{}'
```

For fixture-based UI work use `FSX_DATA_SOURCE=stub` and restart the dev server after changing it.
Do not interpret a fake role header or the dev seed as a payment/storage acceptance test.

## Dev-deployment acceptance

After team review, use the team's approved Stripe **test-mode** credentials and dev deployment,
within configured business hours. Have the owner confirm any test users/order data are labelled.

1. Submit an available regular item using a size ID returned by `/api/menu`, a valid future pickup
   time and test customer contact details. Confirm 201, Location and the Stripe-hosted checkout URL.
2. Complete Stripe test checkout. Verify one order with its lines/components and unchanged
   name/price/tax snapshots. Confirm payment becomes paid and ticket becomes received only after
   the signed webhook; refresh the confirmation page to prove it reloads persisted data.
3. Repeat with a mixed tray order and a combo. Check 40-minute lead time and two combo components.
4. Replay the same payment event through Stripe's test tools. Confirm no duplicate payment,
   duplicate paid transition or extra order lines.
5. Confirm invalid quantities, sold-out items, too-early pickup and a tampered browser price cannot
   save an invalid order. Use API responses and trusted read-only queries, not manual paid updates.
6. Record deployment/commit, test order IDs, responses and results for Hiab, without contact details,
   credentials or checkout URLs in shared logs. Do not mark the Jira task Done from CI alone.

## Operational boundaries

This request-size bound is not a rate limiter. Public checkout also needs an environment-level
abuse/rate policy selected by the hosting administrator; an in-memory counter would not enforce a
global limit across serverless instances. No hosting security setting is changed by this task.

The creation POST is not idempotent across separate submissions. The existing UI blocks concurrent
submits and does not automatically retry an ambiguous network failure. The Stripe idempotency key
deduplicates session creation for one order, not creation of a second order. Cross-request order
deduplication requires an agreed persistent key/retention design and team-reviewed database work;
do not claim it is solved by a process-local cache.

References: [Microsoft API design](https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-design),
[OWASP REST security](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html),
[Stripe Checkout Session creation](https://docs.stripe.com/api/checkout/sessions/create),
[Supabase database functions](https://supabase.com/docs/guides/database/functions).
