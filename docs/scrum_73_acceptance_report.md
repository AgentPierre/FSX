# SCRUM-73 / T34 acceptance test results

PR: [#21](https://github.com/hiabnegash-lang/FSX/pull/21). Tested application commit: `5a19b6cc3e0beb389340d8c7070eeefb6a6d97ae`.

**Result: 26 local HTTP acceptance checks passed; zero failed. Deployed unauthenticated protection checks passed. Full browser and authenticated hosted acceptance are still pending.**

## Environments and evidence

- Deployed PR preview: [owner history](https://fsx-git-feature-t34-perry-orde-0b7cbb-hiabnegash-langs-projects.vercel.app/owner/orders). Requests had no authenticated user session.
- Local Next.js dev server: explicit `FSX_DATA_SOURCE=stub`, localhost only, 30 disposable in-memory paid orders created through the existing dev seed endpoint. Local owner/staff checks use the documented stub-role headers; these do not prove Supabase Auth or RLS behavior.
- [PR-triggered CI](https://github.com/hiabnegash-lang/FSX/actions/runs/41112300452) and [branch-push CI](https://github.com/hiabnegash-lang/FSX/actions/runs/41111695869) passed tests, lint, typecheck, build, and the aggregate gate. Vercel deployment passed. Existing CI results were inspected; the local test suite/linter/build was not rerun.
- Detailed local request results: [JSON evidence](scrum_73_http_acceptance.json).

## Deployed preview checks

| Check | Observed result |
| --- | --- |
| Login page | HTTP 200; private/no-store cache headers |
| Anonymous owner history | Streamed redirect to `/login`; no owner payment detail rendered; noindex present |
| Anonymous direct owner detail | Streamed redirect to `/login`; no owner payment detail rendered; noindex present |
| Anonymous owner API | HTTP 401; private/no-store |
| Owner API with spoofed `x-stub-role: owner` | Still HTTP 401 with `unauthenticated` |

The owner pages return an HTTP 200 streaming shell containing the login redirect; that response alone is not evidence of access. The redirect marker and absence of the protected content were checked. Live signed-in access has not been established.

## Local acceptance checks

| Area | Observed result |
| --- | --- |
| Default pagination | 30 orders total; page 1 has 25, page 2 has 5; no overlapping IDs |
| Combined filters | Customer name plus Received status returns six matching fixtures |
| Display order-number search | `#0001` finds the matching order |
| Literal search | A literal percent does not match every order |
| Validation | Page zero, repeated page values, unknown status, oversized page size and reversed dates return HTTP 400 |
| API role denial | Anonymous HTTP 401; staff HTTP 403 |
| Second-page HTML | Five order-detail links render |
| Invalid/empty pages | First-page recovery and useful empty-state messages render |
| Detail content | Owner contact and Checkout session reference render; return link preserves filters |
| Cancellation initial HTML | Cancel action renders; confirmation is initially closed; this is not a click-through test |
| Guest projection | Customer email and Checkout session reference are absent |
| Staff cancellation | HTTP 403 |
| Owner cancellation | Completed paid ticket becomes Cancelled; payment remains Paid, amount is unchanged, record remains in history |
| Cancelled detail | Cancellation action no longer renders |
| Repeat cancellation | HTTP 409; cancellation is final |
| Date boundaries | Exact lower bound includes the order; exact exclusive upper bound excludes it |
| Calendar dates | Inclusive same-day Central date range includes all 30 fixtures |
| Direct staff detail | Access-denied content renders without owner contact/payment details |

The JSON evidence lists each of the 26 assertions separately. No hosted orders, payments, roles, account settings or schema were changed. Only one disposable in-memory fixture ticket was cancelled.

## Retention and DST

The existing passing CI coverage includes older-than-six-month history and Central-time DST boundaries. Code inspection confirms no default date cutoff in the owner page or stores: date constraints apply only when requested. These checks support BR-24's minimum-retention rule. No six-month-old hosted fixture was created or inspected, and this run does not establish the hosted retention configuration.

## Pending acceptance work

Browser inventory reported no connected browser. No authenticated test-owner or test-staff session was available. The user was asked to connect a browser and sign in using the provisioned test accounts. Until that access exists, the following remain **not tested**:

1. Open cancellation confirmation, select Keep order, and confirm the ticket remains unchanged.
2. Confirm cancellation by click; check busy/disabled behavior, visible success, status refresh and disappearance of the action.
3. Check network/API error handling in the interactive component and keyboard/focus behavior.
4. Verify tablet/mobile layout and navigation through real browser interactions.
5. On the deployed preview, sign in separately as test owner and test staff; verify direct-page/API access, staff cancellation denial, and authenticated owner cancellation on an explicitly disposable paid test order.
6. Verify the corresponding Supabase RLS and audit attribution with the real authenticated session, and confirm historical data remains available after reconnecting/refreshing.

No merge was performed. The passing HTTP and CI checks should not be reported as completed live acceptance.
