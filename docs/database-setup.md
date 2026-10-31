# T23 database setup — Perry Takyi / SCRUM-62

This branch prepares the database schema and initial menu load. It does not apply changes to the hosted team database. SCRUM-64 is the backend/API support task; the current application continues to use its stub data store until that integration is completed.

## Files and scope

- `supabase/migrations/20261013014325_t23_database_schema.sql`: all 12 tables, constraints, indexes, RLS, menu timestamps, price/status audit triggers and owner-only ticket cancellation.
- `supabase/seed.sql`: exactly 46 menu items and 58 purchasable sizes generated from `docs/menu.csv`, plus seven business-hour rows and one settings row.
- `scripts/generate_menu_seed.py`: reproducible CSV-to-SQL conversion using Decimal arithmetic and stable IDs; it never edits the CSV.
- `supabase/tests/t23_schema_rls.test.sql`: disposable-database tests for access rules, payment/ticket values, positive prices, uniqueness and historical snapshots.
- `.github/workflows/database.yml`: applies migration/seed and runs database tests on GitHub, separately from application CI. Both checks must pass before merging.

The supplied Downloads menu matches the repository CSV exactly. Names, codes, descriptions, spicy flags and prices come from that CSV. Empty descriptions become SQL null; regular prices produce one `regular` size, rice prices produce `sm`/`lg`, and tray prices produce `S`/`M`/`L`. Availability defaults to active/available. Catering follows the CSV's 40-minute lead marker. `served_with_rice`, `notes`, and per-item lead minutes have no columns in Charles's final model; they are retained in the unmodified CSV, not silently turned into extra schema fields. Checkout uses the regular/catering lead settings.

Seed runs insert missing rows and preserve existing owner edits; they do not synchronize or overwrite a live menu. Hiab allows one clearly labelled test owner and one test staff account in the hosted project, provisioned separately from the seed through trusted administration. They must be removed from active use before final handover; see [account provisioning and cleanup](supabase-connection.md#provisioning-temporary-test-accounts). G7 and G8 do not exist and are not generated.

## Apply to a local development database

Use this worktree's root directory. Docker Desktop must be running. The CLI is invoked through `npx`; it is not added as an application dependency.

```powershell
npx --yes supabase@2.78.1 start
npx --yes supabase@2.78.1 db push --local --include-seed
npx --yes supabase@2.78.1 test db
```

On a fresh local stack, `start` applies migrations and seeds during initialization. The explicit local push also covers an existing stack with pending migrations; the seed is repeatable. These commands do not target the linked hosted project. Avoid `db reset` on a local database whose data you want to keep: it rebuilds that database.

Expected initial counts are seven categories, 46 items, 58 sizes, seven business-hour rows and one settings row. Tests run in a transaction that rolls back the test identities, orders and edits. The database CI uses the same pinned CLI and a disposable stack. No local test suite is used as a pre-PR gate in Perry's Codex workflow.

## Push migrations and seed to the team project

After the team has reviewed the PR, confirmed the ERD and menu load, and checked the intended target project, run:

```powershell
npx --yes supabase@2.78.1 login
npx --yes supabase@2.78.1 link --project-ref csvuhyeplcxvzlvkduwj
npx --yes supabase@2.78.1 migration list --linked
npx --yes supabase@2.78.1 db push --linked --dry-run --include-seed
```

Review the migration list and dry run. This is a first-schema migration, not a reconciliation script for manually created tables. If the hosted database already contains conflicting tables or untracked schema changes, stop and coordinate the baseline with Hiab rather than deleting tables or repairing history blindly. Confirm the hosted Postgres major version; local config currently uses PostgreSQL 17.

When the pending migration and project are correct:

```powershell
npx --yes supabase@2.78.1 db push --linked --include-seed
```

`db push` alone does not load this seed; `--include-seed` explicitly includes the configured `supabase/seed.sql`. Let the CLI prompt for credentials or use your existing secure login; never commit passwords or paste them into a shared command. Keep all schema changes in migration files rather than editing hosted tables in the SQL editor.

Supabase references: [migration workflow](https://supabase.com/docs/guides/deployment/database-migrations) and [database seeding](https://supabase.com/docs/guides/local-development/seeding-your-database).

## Access and integration notes for SCRUM-64 / T25

Guest clients can read active menu items and sizes, categories, hours and settings, but cannot read orders, lines, payments or roles. A signed-in customer (an Auth user with no `staff_users` row) has exactly the same rights as a guest; the database tests prove it. Sold-out items remain readable with `is_available=false` so the customer UI can display them as unavailable (BR-04); the order API still rejects buying them. Archived items and their sizes are hidden. Authenticated staff/owner identities can read operational order data and update only ticket status. Only owners write menu/configuration, read Stripe references and price history, and cancel tickets. Role records are provisioned through trusted server administration after Supabase Auth users exist; no client can grant itself a role. There is no hard-delete permission for menu/history through the client API.

RLS and column grants are both needed: an order UPDATE policy alone would allow financial edits. This migration revokes broad client grants and grants UPDATE only on `ticket_status`. A later migration (SCRUM-65) also replaces the table-wide SELECT on `orders` with a column list that leaves out `customer_email` and `customer_phone`, so staff and owner sessions cannot read contact details directly; server routes read them with the service role. The role lookup reads the caller's own `staff_users` row without recursion or user-editable JWT metadata. Private audit trigger functions can append logs without making log writes available to clients. See [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security).

Backend work must align its old TypeScript/stub statuses with `pending_payment`, `paid`, `expired` and the five ticket values; convert decimal tax fractions to basis points only at the app boundary; and replace stub Auth with Supabase Auth. Owner cancellation should use the authenticated owner's context so the database can enforce and audit the actor. A service-role request with no owner identity cannot cancel a ticket merely by claiming to be an owner in its payload.

The trusted checkout/webhook implementation must recompute prices, validate pickup hours and mixed-order lead time, allocate unique readable order numbers, create complete orders and their lines/components transactionally, verify Stripe signatures and matching session/amount/currency, and perform idempotent payment confirmation. The schema rejects a duplicate session/order association and invalid stored status values; it does not itself verify an external Stripe signature. Cancelled tickets are excluded from sales reports, which remain **Online orders only**. Refunds are performed in Stripe and followed by an owner cancellation; there is no refunded payment status.

Generate TypeScript database types only after applying the migration to a local or approved linked database, then wire them into the Supabase data layer in its own integration change. Do not claim the application is using this database while `lib/data/index.ts` still exports the stub.

## Review and completion

PR into `dev`, with `T23 -` commits and Hiab's approval; no direct push to `dev` or `main`. This migration prepares SCRUM-62 but that Jira task still needs an actual deployment and owner menu review before completion. SCRUM-64 still needs backend integration; schema files alone do not complete it.

PR #5's final ERD documents have merged into `dev` and are incorporated here with the T23 implementation notes. The old PR #1 targeting `main` is closed. This branch and PR #6 remain subject to the team's review process; nothing is merged automatically.
