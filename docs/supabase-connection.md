# T25 / SCRUM-64 — Connect FSX to Supabase

The app now defaults to the Supabase data store. The deployed T23 database is project `csvuhyeplcxvzlvkduwj`, with URL `https://csvuhyeplcxvzlvkduwj.supabase.co`. The menu catch-up and tray-name migrations bring the hosted menu to 46 items and 58 priced sizes, including A4 and C19–C21.

## Runtime connection

Put values in ignored `.env.local` for local development and in the hosting provider's environment settings for deployment. `.env.example` lists names only:

```dotenv
FSX_DATA_SOURCE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://csvuhyeplcxvzlvkduwj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<project public anon or publishable key>
SUPABASE_SERVICE_ROLE_KEY=<server-only project service-role or secret key>
```

Use the existing Stripe **test-mode** variables from `.env.example` for checkout; the database connection does not supply Stripe credentials. Keep the service key server-only, never in a `NEXT_PUBLIC_` variable or GitHub commit. Do not run `supabase config push`: hosted Auth security settings are administered separately.

Hiab must check `NEXT_PUBLIC_SUPABASE_URL` in every Vercel environment, including Preview and Production: the exact value is `https://csvuhyeplcxvzlvkduwj.supabase.co`, without quotes, surrounding spaces or an API path. Redeploy affected environments after correcting it. The reviewed preview failed with `Invalid supabaseUrl`; resolve that environment setting before merging.

The customer layout reads menu, prices, tax and hours from Supabase through the existing `DataStore` interface. Public RLS exposes active sold-out items as unavailable, while the order API rejects purchasing them. UUID size IDs from Supabase replace fixture IDs, so clear any cart saved before this connection if its old entries are rejected.

`FSX_DATA_SOURCE=stub` is an explicit local-only escape hatch for teammates doing isolated UI work; it is refused in production. Database failures never silently fall back to the in-memory fixture. The dev seed endpoint is disabled in Supabase mode, even when running locally, so it cannot insert fake paid orders into the shared project.

Teammates doing local UI work without keys, including Noor's kitchen work, should set `FSX_DATA_SOURCE=stub` in ignored `.env.local`; this also enables the local dev seed. Omitting it selects the live database.

## Orders and payments

The new `t25_live_data_store` migration adds three server-only, invoker RPCs. They are not callable by public or authenticated browser roles:

- `create_checkout_order`: saves order, lines and combo halves in one transaction; checks current prices, availability and totals under locks; rolls back an invalid checkout completely.
- `attach_checkout_session`: attaches one session per pending order, safely accepting a repeated identical attachment.
- `confirm_checkout_payment`: serializes retries using an order lock and updates payment timestamp plus paid/received statuses together. Repeated confirmations return already-paid without duplicate audit events.

The server still validates business hours, pickup lead time and the Stripe signature/site tag/amount/currency. Database status checks remain in force. A payment arriving before its association is saved returns a retriable error instead of being silently lost. Tax fractions convert to basis points only at the TypeScript boundary.

Hiab confirmed a running number displayed as `#0042`, zero-padded and unique for all time. Numbers are allocated with a database sequence for concurrency safety; gaps are normal after a rolled-back attempt. The sequence and RPCs are reviewable migration changes, not a manual hosted edit.

If checkout-session creation succeeds but saving its association fails, the API attempts to expire the Stripe session before expiring the pending order. A failed Stripe cleanup is logged for administrator follow-up; no checkout URL is returned to the customer on that failure path.

## Staff and owner access

`/login` signs into existing Supabase Auth accounts. Provision team users through trusted administration and assign matching `staff_users` roles; there is no public sign-up form or self-service role assignment. API authorization verifies the user with Supabase Auth and reads its database role. The development `x-stub-role` header is ignored in live mode.

Staff/owner ticket updates use the signed-in session, preserving RLS, audit attribution and owner-only cancellation. The server service key is limited to trusted checkout, webhook and authorized reads; customer routes continue returning only the approved public order projection. Staff APIs omit contact/financial details. The existing database-level staff SELECT access to contact columns remains a separately documented SCRUM-85 security-review follow-up.

Use Supabase Auth banning/revocation for offboarding rather than deleting identities referenced by audit records. Hosted public sign-ups and password strength are owner-administered follow-ups and are not changed by this PR.

### Provisioning temporary test accounts

Hiab permits one clearly labelled test owner and one test staff account on the hosted project. In **Supabase Dashboard → Authentication → Users → Add user**, a trusted administrator creates the two Auth users using team-controlled email addresses labelled as test accounts (for example, aliases containing `fsx-test-owner` and `fsx-test-staff`). Use strong, separate passwords shared privately; never put passwords in SQL, seeds, git or PR comments. Complete email confirmation using the administrator's trusted provisioning flow, then copy each user's UUID.

In the project's SQL editor, a trusted administrator runs this **data-only provisioning** SQL after replacing the placeholders with those exact Auth UUIDs. This is not a schema edit and is not part of `seed.sql`:

```sql
begin;
insert into public.staff_users (id, role) values
  ('<test-owner-auth-user-uuid>'::uuid, 'owner'),
  ('<test-staff-auth-user-uuid>'::uuid, 'staff');
commit;
```

Sign in through `/login` as each account. Verify the staff account cannot access owner APIs or cancel tickets, while the owner can. These test accounts must be removed before the final handover: revoke their sessions and ban them first, then remove role/Auth rows only if no audit records reference them. Audit foreign keys deliberately prevent deleting referenced identities; retain those disabled identities to preserve history and confirm they cannot sign in. Do not delete audit records to remove a test account.

## Application and review

The T25 migration must be reviewed and applied before order creation and payment persistence can use these RPCs. Deployment order is: dry-run and apply menu migrations `20261019000000` and `20261020000000`; merge current `dev` into this branch; dry-run `20261020000443_t25_live_data_store` and have Hiab review its output before a real push; then merge the reviewed PR and run the Stripe test-mode checkout acceptance test. Menu/settings/hours reads work against T23 plus the menu migrations. The T25 migration remains unapplied until Hiab approves that deployment.

Table types in `lib/database.types.ts` are generated from the deployed T23 schema; `lib/data/database.ts` adds the reviewed RPC contract until the migration is applied and types can be regenerated. The app's existing routes and response shapes are retained.

## GitHub deployment integration

An app connection and a repository deployment integration are separate. The former uses runtime environment variables; the latter lets Supabase respond to GitHub repository changes.

Verified in the Supabase dashboard: this project is connected to `hiabnegash-lang/FSX`. Its saved working directory is `.`, **Deploy to production** is enabled, and the production branch is `main`. Automatic preview branching is off. These existing settings were inspected and left unchanged.

The team reviews changes into `dev`; the saved production integration deploys from `main` and stays enabled by Hiab's decision. Merging this PR into `dev` therefore does not apply its migration to the hosted production database. Apply every migration through the reviewed CLI dry-run process before the release: the release checklist requires all migrations already applied and `migration list --linked` showing none pending, so `main` carries nothing new to apply. Supabase preview checks are skipped while automatic branching is off. GitHub linkage does not replace Vercel runtime credentials; configure the runtime variables above in the appropriate hosting environments.

No repository access grant, integration setting change, hosted Auth configuration change, or paid branch was made by this code PR.
