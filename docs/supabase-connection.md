# T25 / SCRUM-64 — Connect FSX to Supabase

The app now defaults to the Supabase data store. The deployed T23 database is project `csvuhyeplcxvzlvkduwj`, with URL `https://csvuhyeplcxvzlvkduwj.supabase.co`. The initial hosted menu contains 42 items and 54 priced sizes. Hiab's additional menu-item PR is separate; this connection does not import its unmerged seed changes.

## Runtime connection

Put values in ignored `.env.local` for local development and in the hosting provider's environment settings for deployment. `.env.example` lists names only:

```dotenv
FSX_DATA_SOURCE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://csvuhyeplcxvzlvkduwj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<project public anon or publishable key>
SUPABASE_SERVICE_ROLE_KEY=<server-only project service-role or secret key>
```

Use the existing Stripe **test-mode** variables from `.env.example` for checkout; the database connection does not supply Stripe credentials. Keep the service key server-only, never in a `NEXT_PUBLIC_` variable or GitHub commit. Do not run `supabase config push`: hosted Auth security settings are administered separately.

The customer layout reads menu, prices, tax and hours from Supabase through the existing `DataStore` interface. Public RLS exposes active sold-out items as unavailable, while the order API rejects purchasing them. UUID size IDs from Supabase replace fixture IDs, so clear any cart saved before this connection if its old entries are rejected.

`FSX_DATA_SOURCE=stub` is an explicit local-only escape hatch for teammates doing isolated UI work; it is refused in production. Database failures never silently fall back to the in-memory fixture. The dev seed endpoint is disabled in Supabase mode, even when running locally, so it cannot insert fake paid orders into the shared project.

## Orders and payments

The new `t25_live_data_store` migration adds three server-only, invoker RPCs. They are not callable by public or authenticated browser roles:

- `create_checkout_order`: saves order, lines and combo halves in one transaction; checks current prices, availability and totals under locks; rolls back an invalid checkout completely.
- `attach_checkout_session`: attaches one session per pending order, safely accepting a repeated identical attachment.
- `confirm_checkout_payment`: serializes retries using an order lock and updates payment timestamp plus paid/received statuses together. Repeated confirmations return already-paid without duplicate audit events.

The server still validates business hours, pickup lead time and the Stripe signature/site tag/amount/currency. Database status checks remain in force. A payment arriving before its association is saved returns a retriable error instead of being silently lost. Tax fractions convert to basis points only at the TypeScript boundary.

Running, zero-padded order numbers preserve the current stub's presentation, now allocated with a database sequence for concurrency safety; gaps are normal after a rolled-back attempt. The final display format still needs Hiab's confirmation. The sequence and RPCs are reviewable migration changes, not a manual hosted edit.

## Staff and owner access

`/login` signs into existing Supabase Auth accounts. Provision team users through trusted administration and assign matching `staff_users` roles; there is no public sign-up form or self-service role assignment. API authorization verifies the user with Supabase Auth and reads its database role. The development `x-stub-role` header is ignored in live mode.

Staff/owner ticket updates use the signed-in session, preserving RLS, audit attribution and owner-only cancellation. The server service key is limited to trusted checkout, webhook and authorized reads; customer routes continue returning only the approved public order projection. Staff APIs omit contact/financial details. The existing database-level staff SELECT access to contact columns remains a separately documented SCRUM-85 security-review follow-up.

Use Supabase Auth banning/revocation for offboarding rather than deleting identities referenced by audit records. Hosted public sign-ups and password strength are owner-administered follow-ups and are not changed by this PR.

## Application and review

The T25 migration must be reviewed and applied before order creation and payment persistence can use these RPCs. Menu/settings/hours reads work against the already-applied T23 schema. Use the same dry-run-first process as T23, inspect the exact pending migration list, and stop before a real push until the team approves that deployment. No new migration is applied automatically while preparing this PR.

Table types in `lib/database.types.ts` are generated from the deployed T23 schema; `lib/data/database.ts` adds the reviewed RPC contract until the migration is applied and types can be regenerated. The app's existing routes and response shapes are retained.

## GitHub deployment integration

An app connection and a repository deployment integration are separate. The former uses runtime environment variables; the latter lets Supabase respond to GitHub repository changes.

In Supabase **Project Settings → Integrations → GitHub repository**, the current account cannot find `hiabnegash-lang/FSX`; it lists the account's own authorized repositories instead. Hiab must authorize/install the Supabase GitHub app for **only** that repository, or provide the needed repository-administration permission. Do not connect an unrelated personal repository.

After authorization, choose `hiabnegash-lang/FSX`, inspect available branch/deployment settings and the plan/cost requirements, and select the integration branch deliberately. The team's migration source is `dev`; `main` is releases only, so do not enable automatic production database changes on every push to main without agreeing the deployment policy. Preview branches can incur charges; do not enable them without explicit cost approval. GitHub linkage does not replace Vercel runtime credentials.

No repository access grant, automatic production deployment, hosted Auth configuration change, or paid branch is enabled by this code PR.
