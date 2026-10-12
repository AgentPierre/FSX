# Perry's Playbook — Developer (Database, Owner Dashboard, Reporting)

Hey Perry — read `CLAUDE.md` at the repo root first; Claude Code loads it automatically too.

## Before anything else
The `DB_Password.txt` file in the team's shared folder needs to be deleted and the Supabase
credentials rotated, if that hasn't happened yet. Secrets live in `.env.local` on each person's
machine (gitignored), with only the key *names* in `.env.example`. No hard feelings — it's a
five-minute fix, and our own RTM row 7.02 commits us to it.

## Setup (one time)
```bash
git clone https://github.com/hiabnegash-lang/FSX.git && cd FSX
git checkout dev
npm install
cp .env.example .env.local        # values from Hiab
npx supabase login
npx supabase link --project-ref csvuhyeplcxvzlvkduwj
npm run dev
```
Every task: `git checkout dev && git pull` → `git checkout -b feature/T<id>-perry-<desc>` → build → PR
into `dev` → tag Hiab.

---

## Your tasks
| ID | Week | Due | Task | Role |
|----|------|-----|------|------|
| T14/T15 | W2 | 12 Oct | ERD, DB schema, tables overview | Support Charles |
| **T23** | W3 | 19 Oct | **Database created and loaded with menu and price data** | **Owner** |
| T25 | W3 | 19 Oct | Backend skeleton / API endpoints | Support Hiab |
| T30 | W4 | 26 Oct | Order submission and storage API | Support Hiab |
| **T34** | W4 | 26 Oct | **Owner dashboard — order history** | **Owner** |
| **T36** | W4 | 26 Oct | **Test environment** | **Owner** |
| **T38** | W5 | 2 Nov | **Owner dashboard — menu and price management** | **Owner** |
| **T39** | W5 | 2 Nov | **Owner dashboard — operational reports** | **Owner** |
| T42 | W5 | 2 Nov | System Operations document | Support Derrion |
| T49 | W6 | 9 Nov | Defect fixes | Support Hiab |
| T52 | W6 | 9 Nov | User Manual — operations and reports | Support Derrion |
| T60 | W7 | 16 Nov | Source code package | Support Hiab |

**T23 is blocked until Charles's ERD is approved on 12 Oct.** Until then do the W2 support work
and read the ERD review in `docs/erd-review-and-answers.md` — it lists the changes going into the
final model.

---

## Prompts

### W2 — Help Charles finish the schema (T14/T15)
> Read CLAUDE.md and docs/erd-review-and-answers.md. Produce docs/tables-overview.md: one section
> per table with every column, type, primary and foreign keys, nullability, and a one-sentence
> description. Then produce a Mermaid erDiagram of the same model in docs/erd.md. Pay attention to
> the decisions in the review: price lives on item_sizes not menu_items, order_lines snapshot both
> price and item name, payment_status and ticket_status are separate columns, business hours and
> settings are separate tables, and orders carry a human-readable display order number.

Send both to Charles — he redraws the official ERD in Visio.

### W3 — T23: Create the database and seed the menu
*(Only after the 12 Oct approval.)*
> Read CLAUDE.md and docs/tables-overview.md. Create a Supabase migration that builds every table
> with constraints and indexes (orders.created_at, orders.ticket_status, order_lines.order_id, a
> unique constraint on the Stripe session id). Add an updated_at trigger on menu_items, and a
> trigger writing to price_change_log whenever a price on item_sizes changes. Add a check
> constraint enforcing that ticket_status is null while payment_status is pending_payment. Enable
> RLS on every table: anyone may SELECT categories and available items; only role 'owner' may write
> menu, sizes and settings; 'owner' and 'staff' may SELECT orders and order_lines; only 'owner' and
> 'staff' may UPDATE ticket_status. Then write supabase/seed.sql from docs/menu.csv — 42 items with
> real codes, names and prices, including the sm/lg fried rice and S/M/L catering tray sizes. Show
> me how to apply it locally and then push with `supabase db push`.

> Generate TypeScript types into lib/database.types.ts with `supabase gen types typescript` and
> wire them into the Supabase clients.

### W4 — T34: Order history
> Build /owner/orders as a server-rendered page restricted to role 'owner'. Table of paid orders:
> display order number, date and time, customer name, item count, total, ticket status. Filters for
> date range and ticket status, and search by customer name or order number, all driven by URL
> search params. Paginate 25 per page. Row click opens /owner/orders/[id] with the full line items,
> sizes, options, instructions and the Stripe payment reference. Clean and readable on a tablet.

### W4 — T36: Test environment
> Set up a separate test environment: a second Supabase project or branch, and a Vercel preview
> deployment tied to the dev branch. Document what env variables each environment needs in
> docs/environments.md, update .env.example, and include how to run migrations and seed against the
> test database.

### W5 — T38: Menu and price management
> Build /owner/menu for role 'owner'. List items grouped by category with inline editing of name,
> description and availability, and price editing per size (entered in dollars, stored in cents).
> An "86 this item" toggle for sold-out-today, separate from an archive action for off-the-menu.
> Create, delete and reorder for items and categories. Server actions with zod validation and a
> toast on save. A "price history" drawer per item reading price_change_log. Verify a changed price
> appears immediately on the customer menu and does not alter past orders.

### W5 — T39: Reports
> Build /owner/reports for role 'owner'. Create Postgres views or RPC functions for: daily sales
> totals over a date range, order count and average order value, top 10 items by quantity and by
> revenue, and orders by hour of day. Render with Recharts — a line chart for sales over time, a bar
> chart for best sellers, and summary stat cards. Date range picker defaulting to the last 30 days,
> and a CSV export per report. Label every report "Online orders only" — walk-in sales stay on the
> POS and are deliberately not included.

### W6 — T49: Defect fixes
> Here is a defect from the test log: <paste>. Reproduce it, find the root cause, fix it with the
> smallest change that works, and add a test if practical. Explain the cause in two sentences I can
> paste into the issue log.

### Docs support (T42, T52)
> Read the codebase and draft the "Reports" and "Menu management" sections of the user manual for a
> non-technical restaurant owner — step by step, where to click, what each report means, how to
> change a price, how to mark an item unavailable. Output docs/user-manual-owner.md.

---

## Definition of done
- Works locally and on the dev preview
- PR into `dev`, reviewed by Hiab, listing RTM IDs covered (F15–F30 are mostly yours)
- No secrets committed; RLS still enforced
- Jira card moved to Testing
