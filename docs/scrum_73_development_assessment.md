# SCRUM-73 / T34 development assessment

Assessed: 2026_10_26. Repository: `hiabnegash-lang/FSX`. Baseline: `origin/dev` at `3b70c17be4a3b23a838252327795786a3346d188`.

## Outcome and scope

[SCRUM-73](https://fustionsolutionsxp.atlassian.net/browse/SCRUM-73) is **Owner dashboard - order history view**. Jira describes search and filtering, assigns Perry, names Jose as support, and gives a due date of 2026_10_28. The repository's `docs/PERRY.md` maps this work to T34, with an older 26 October schedule date. Use Jira for the current due date; confirm schedule discrepancies with the team if needed.

The user explicitly confirmed history **and order details**. Implement the fuller T34 brief: an owner-only history table with URL-based search, date/status filters, pagination, and a detail page showing historical lines and a Stripe reference. Menu management (SCRUM-76) and operational reports (SCRUM-77) are separate tasks.

This assessment changes documentation only. No application implementation, dependency installation, database changes, local test/lint/build runs, commits, pushes, or PRs were performed. Git pull completed successfully: dev was already current. An isolated detached worktree, `fsx_scrum_73`, was created from `origin/dev`; existing edits in `fsx_w2` were preserved.

## What the code already provides

| Area | Existing behavior | Development implication |
| --- | --- | --- |
| `app/owner/orders/page.tsx` | Placeholder | Build the history UI here. |
| `app/api/owner/orders/route.ts` | Owner authorization, Zod validation, paid-order results, search/filter/page parameters, no-store response | Reuse its contract rather than inventing a second query format. |
| `lib/views.ts` | Owner projection, quantity-based item count, historical line names/prices, contact details, Checkout session ID | Reuse the projection and integer-cent formatting. |
| `lib/data/supabase.ts:listOrders` | Database filtering, exact count, payment-time ordering, ID tie-breaker, bounded range | Keep filtering and pagination in the database. |
| `lib/data/stub.ts:listOrders` | Matching filter/page interface | Useful for development; equal-time ordering lacks the live store's ID tie-breaker. |
| `lib/auth.ts` | Verified Supabase user and `staff_users` role lookup; explicit local stub mode | Reuse role logic for each protected read. |
| `middleware.ts` | Session verification/refresh and private cache headers | It does not enforce owner role or redirect unauthorized page visits. |
| `app/api/orders/[id]/route.ts` | Guest-facing projection with restricted fields | Do not expand this public response for owner details. |
| Migrations | Orders, payment references, line snapshots, RLS | No initial schema migration appears necessary. |

The project uses Next.js 15.5.27, React 19, Supabase, Stripe, Zod, and Tailwind. Follow the existing App Router folders and `docs/DESIGN.md` tokens; a table library or new service is unnecessary.

## Implementation approach

1. **Centralize protected reads.** Add a small server helper, for example `lib/owner-orders.ts`, that authorizes the owner before calling `store.listOrders` or `store.getOrder`. Reuse `requireRole` through a small server-context adapter/refactor as needed: it currently expects a Request, while pages read cookies/headers through Next.js. Keep API 401/403 behavior and page sign-in/denial behavior explicit. Never treat a URL, client state, or middleware session refresh as an owner-role check.
2. **Share query validation.** Extract the existing owner-query schema into a focused module used by the list API and page. Retain `q`, `status`, `from`, `to`, `page`, and `pageSize`; default to 25 and preserve the API maximum of 100. Reject reversed date ranges and invalid/unsafe page offsets. Handle repeated URL parameters consistently. Reset page to 1 when filters change.
3. **Build the server-rendered list.** Await Next.js 15 `searchParams`; render order number, payment date/time, customer, quantity count, total, and ticket status. A GET form with an Apply button can preserve URL state without new dependencies. Pagination preserves all active filters. Provide reset filters, empty results, loading, error, and out-of-range page handling.
4. **Build `app/owner/orders/[id]/page.tsx`.** Check owner access before fetching; handle missing/unpaid orders explicitly. Show contact details, pickup time, historical line names, sizes, quantities, spicy options, combo components, instructions, subtotal, tax, total, and clearly labelled Stripe Checkout session reference. Use an actual order-number link so keyboard navigation works; preserve list filters on return.
5. **Connect navigation.** Add the history link on the owner dashboard. Add shared owner navigation only where needed; existing `/owner`, `/owner/menu`, and `/owner/reports` remain mostly placeholders.
6. **Document and validate.** Update `docs/api.md` if the contract changes. Add focused authorization, filtering, projection, and pagination coverage using the existing Node test harness; send verification through CI. Review tablet navigation and keyboard use in a dev server.

Server pages should call the protected helper directly rather than HTTP-fetch their own API. Both the API and pages should use that same helper so authorization cannot drift. Keep full contact/payment details on the protected detail screen where practical; do not serialize raw store objects into client components.

## Semantics and gotchas

- **Date basis:** the documented API filters `payments.paid_at`, not order creation or pickup. Label it as payment date. Treat selected calendar days as `America/Chicago` dates, converting the start and the following day's midnight to UTC. The interval is start-inclusive/end-exclusive. Account for DST; adding 24 hours is not a safe calendar-day conversion. `lib/hours.ts` supplies Central-time display parts, not a date-to-UTC boundary converter.
- **Statuses:** include all five ticket states, including cancelled, for paid-order history. Cancelled-order exclusion applies to sales reports; it should not erase history. Keep `paymentStatus` and `ticketStatus` separate.
- **Authorization:** `listOrders`, `getOrder`, and mapping queries use a service-role client without the user's token, bypassing RLS. Calling them directly from an unguarded page would expose data. The existing API guard is essential and must also cover new server-rendered entry points.
- **Historical accuracy:** use stored item-name, size, and price snapshots. Combo components currently resolve to menu codes, not historical component-name snapshots; display those codes or treat richer snapshots as separate scope.
- **Stripe reference:** `OwnerOrder` exposes `stripeSessionId`. The schema has a payment-intent column, but the current mapping does not expose it. Start with the clearly labelled session ID; expanding to a PaymentIntent reference needs an explicit contract and write-path review.
- **Search and pagination:** retain the current literal escaping for PostgREST filters. Check names with punctuation and literal `%`/`_`, leading-zero order numbers, and optional display `#` normalization. Retain the live store's payment-time-plus-ID ordering and align stub ties. Offset pages can shift when new orders arrive; that is acceptable for this small existing contract unless requirements change.
- **Fixtures:** the dev seed contains five paid examples and no cancelled case. It cannot prove pagination or all statuses. Its `minsAgo` affects pickup time, but `markPaid` assigns the current payment time, so it does not generate meaningful historical payment dates.
- **Requirements traceability:** the current RTM is not present as an identifiable source in this checkout. Confirm the actual history/detail requirement IDs before filling the PR template; do not infer them from the general F15-F30 range in the playbook.

## Acceptance and verification

- Anonymous visitors cannot read owner data; staff accounts are denied; owners can access list and direct detail URLs. In live mode, a spoofed `x-stub-role` must grant no access.
- Only paid orders appear, including paid cancelled tickets. Results sort newest payment first with deterministic ties; item count sums quantities.
- Combined search/status/date filters work, survive refresh/back navigation, and reset pagination appropriately. Page 2 works with more than 25 orders; no matches and invalid pages have clear behavior.
- Central-time midnight boundaries and DST transitions return the intended days. Invalid dates, reversed ranges, oversized queries, and extreme pages are handled safely.
- Details retain historical prices after menu changes, display missing optional phone safely, and keep contact/payment references out of guest responses.
- A labelled semantic table, text status labels, visible focus, explicit links, labelled inputs, and tablet layout support practical owner use.

Existing `tests/api-contract.test.mjs` covers role checks through `/api/users/me`, but the inspected test files do not establish dedicated history endpoint, pagination, or owner detail coverage. Add those meaningful cases for implementation. Current `.github/workflows/ci.yml` runs Node tests in `checkout-cleanup` and sequential lint/typecheck/build in `check`; it triggers on PRs only. The user's global desired CI layout and pre-PR-green rule do not match this configuration. Resolve that workflow timing when implementation is ready; do not claim a green implementation CI result from this assessment.

## Official supporting documents

Reviewed online on 2026_10_26. These are primary vendor publications and W3C accessibility guidance. They support engineering choices; they do **not** certify this application or constitute independent certification of the guides.

| Publisher and document | Why it qualifies | Application to SCRUM-73 |
| --- | --- | --- |
| [Microsoft: RESTful web API design](https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-design) | Official Azure Architecture Center guidance | Bounded list responses, resource URLs, query filters, and pagination. Keep the existing API's parameter names. |
| [Microsoft: RESTful web API implementation](https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-implementation) | Official Microsoft implementation guidance | Filter and paginate in the data store; constrain query complexity and document errors. |
| [Next.js: Adding Search and Pagination](https://nextjs.org/learn/dashboard-app/adding-search-and-pagination) | Official framework dashboard tutorial | URL-driven search/page state, server rendering, and resetting page after search. Use an Apply form or native debounce rather than copying its extra dependency. |
| [Next.js 15: page reference](https://nextjs.org/docs/15/app/api-reference/file-conventions/page) | Version-specific framework reference | Await promised route params and searchParams for the installed major version. |
| [Next.js 15: Authentication](https://nextjs.org/docs/15/app/guides/authentication) | Version-specific framework security guidance | Centralized data-access authorization and checks near protected reads; middleware alone is insufficient. Adapt to existing Supabase Auth rather than replacing it. |
| [Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) | Official database platform security reference | Preserve RLS and recognize service-role bypass when evaluating server access. |
| [Square: Search Orders](https://developer.squareup.com/docs/orders-api/manage-orders/search-orders) | Official documentation from a comparable merchant/POS platform | Concrete precedent for combined order filters, date semantics, explicit sorting, and pagination. This supports design decisions; it does not require Square integration or copying Square's status model. |
| [W3C WAI: Tables Tutorial](https://www.w3.org/WAI/tutorials/tables/) | Accessibility guidance from the web standards body | Semantic table headers, captions, and relationships; use keyboard-accessible order links. |

[Shopify's orders query](https://shopify.dev/docs/api/admin-graphql/latest/queries/orders) is an additional commerce precedent for order search and sorting, but Square is the closer POS comparison. [Supabase's changelog](https://supabase.com/changelog) was also inspected; the markdown endpoint was unavailable to the browsing tool, so the HTML index was used. Recheck applicable changes before implementation; this assessment is not a dependency compatibility test.

## Next development handoff

Start a task branch from this dev baseline using the repository convention, such as `feature/T34-perry-order-history`, before implementing. Scope is confirmed as list plus details. Retain documented payment-date filtering, paid-order history, and the session-ID reference unless the owner requests different behavior. Confirm RTM IDs before the PR. No new dependency or schema change is planned.
