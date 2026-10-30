# Owner order history — T34 / SCRUM-73

The owner opens **View order history** from `/owner`. `/owner/orders` lists paid online orders, including cancelled tickets, newest payment first. Search by customer name or order number (`0042` or `#0042`), choose payment dates and a ticket status, then select **Apply filters**. The URL retains these filters for refresh, pagination, and returning from details. Changing filters starts at page 1. Each page contains up to 25 orders; item counts sum quantities.

Dates and displayed times use `America/Chicago`. Both selected dates include the entire calendar day, including 23- and 25-hour DST days. Internally the interval is start-inclusive and next-midnight-exclusive. Dates filter payment time, not creation or pickup time.

Select an order number to open `/owner/orders/[id]`. Details show customer contact information, pickup time, historical item names/sizes/prices, quantity, spicy request, combo codes, instructions, totals, and the Stripe Checkout session ID. No card details are stored. A cancelled ticket retains its original payment record; refunds remain in Stripe's dashboard.

Select **Cancel order**, then **Confirm cancellation** to cancel an active or completed paid ticket. **Keep order** dismisses confirmation without changing anything. Only an owner can cancel; the existing ticket API and authenticated database write enforce this. Cancellation is final, keeps history and payment records, and does not request a Stripe refund. Already-cancelled tickets do not offer the action. Errors remain visible and do not show success until the API confirms cancellation.

## Requirements and retention

Per the lead developer's RTM v0.02 mapping: **F21** covers order history, **F22** covers search/filter, and **F23** covers order detail. Related IDs supplied by the lead are **F17**, **F19**, **4.01**, and **F32** (cancellation from detail). Quincy has open RTM updates; verify ambiguous wording with him rather than invent new mappings.

BR-24 says orders are kept **at least six months**, a minimum retention period, not a maximum display window or deletion date. The history page starts with no date filter, and both stores add date bounds only when requested. Older retained orders remain searchable, paginated, and available through detail URLs. This feature adds no age-based hiding, deletion, or retention job.

## Access and contracts

Both server pages and `GET /api/owner/orders` use `lib/owner-orders.ts`, which verifies the owner role before privileged data-store reads. Anonymous page visits go to sign-in; signed-in staff see an access-denied message. Missing, malformed, pending-payment and expired detail orders return not found. The public guest order endpoint is unchanged and excludes contact/payment references. Owner pages are dynamic and marked noindex; matched middleware responses use private/no-store cache headers.

`lib/owner-order-query.ts` shares validation between the list page and API. The page accepts `q`, `start`, `end`, `status`, and `page`; its page size is fixed at 25. The API retains ISO `from`/`to` instants and optional `pageSize` (1–100). Page numbers are bounded to 1–1,000,000. Repeated recognized parameters, invalid dates/statuses/ranges, and search strings longer than 100 characters are rejected. Supported calendar years are 1000–9998. Known parameters alone are carried into internal return links.

The backend already holds the required data, so this change adds no dependency or migration. Historical combo choices currently appear as menu codes; they do not have component-name snapshots.

## Verification

`tests/owner-orders.test.mjs` covers API and direct-page role enforcement, spoofed stub headers in live mode, invalid filters, Central-time DST boundaries, paid-only stub pagination, equal-time tie ordering, safe historical detail rendering, URL preservation, empty results, invalid pages, visibility of orders older than six months, and owner-only cancellation through the existing ticket API. CI owns automated tests, lint, typecheck and build; no local pre-PR test/build gate is used.

CI also runs on feature/fix/codex branch pushes so it can pass before a PR opens. Tests, lint, typecheck and build run independently. The existing `check` job is retained as an aggregate gate and fails for any non-success result, including cancellation or skipped jobs. Repository branch-protection settings are not changed.

For visual development, use explicit `FSX_DATA_SOURCE=stub`, POST `/api/dev/seed`, and send `x-stub-role: owner` in local requests. This header never grants roles in live mode and stub mode is refused in production. The five default fixtures are insufficient to exercise multiple pages, cancelled tickets, or historical payment boundaries; use dedicated local fixtures for those cases, never the live database.

## Implementation lessons

- Middleware refreshes sessions but does not enforce owner role. Protect each privileged read, including server-rendered pages and direct detail URLs.
- Derive the exclusive end from the next Central calendar midnight, not by adding 24 hours.
- Keep payment and ticket status separate; cancelled paid orders still belong in history.
- Use the shared query contract and snapshot projection to prevent differences between API and page behavior.

See [the development assessment and official source links](scrum_73_development_assessment.md#official-supporting-documents) for Microsoft, Next.js, Supabase, Square and W3C guidance. The assessment records the state before implementation; this document describes the resulting feature.
