# CLAUDE.md — Menciu's Chopstix Order Management System (FSX)

Context file for Claude Code. Read this before doing anything in this repo.

## What we're building
An online ordering system for Menciu's Chopstix, a family-owned Chinese-American restaurant
at 6755 Hillcroft St, Houston. Our sponsor is the owner, Yordanos Araia.
Team 09 · Fusion Solutions Experience (XP) · CIS 4375 · Fall 2026.
**Hard deadline: 17 Nov 2026** — no code or documentation changes after this date.

Three surfaces, one application, one codebase, one login system:
1. **Customer ordering** (public, no account) — browse menu, cart, checkout, pay, confirmation.
2. **Kitchen / counter view** (role: `staff`) — paid orders appear within **5 seconds**.
3. **Owner dashboard** (role: `owner`) — order history, menu & price management, reports.

This is deliberately one unified platform, in the mould of Toast or Clover — approved in the
project charter §3.1. The customer side carries the restaurant's branding; the staff side is a
dense, high-contrast operational UI. Same codebase, two visual treatments.

## Stack
- **Next.js (App Router) + TypeScript + Tailwind** — route groups for `(customer)`, `staff`, `owner`
- **Supabase** — Postgres, Auth (staff only; customers are guests), Realtime (kitchen view)
- **Stripe** — Checkout in **test mode**. We never see, transmit or store card data. An order is
  marked paid **only** by the Stripe webhook, never by the client.
- **Email** — order-ready notification (Resend or similar). New external dependency, logged as a change.
- **Hosting** — Vercel + Supabase (charter revised 3 Oct; AWS Learner Lab is no longer the target)

Supabase project ref: `csvuhyeplcxvzlvkduwj` · Repo: https://github.com/hiabnegash-lang/FSX

## Rules for Claude Code in this repo
- **Never commit secrets.** `.env.local` is gitignored. `.env.example` holds key *names* only.
  (A plaintext password file was found in the team's shared folder on 6 Oct and removed; keys were
  rotated. Do not recreate that pattern anywhere.)
- `SUPABASE_SERVICE_ROLE_KEY` and `STRIPE_SECRET_KEY` are server-only. Never import in a client component.
- All schema changes go through migrations in `supabase/migrations/`. Never edit the DB by hand.
- Row Level Security ON for every table.
- **Prices are always recalculated server-side** from the database. Never trust a price from the browser.
- Money is stored as **integer cents**. Never floats.
- **Git workflow (full detail in `CONTRIBUTING.md`):** branch from `dev` as
  `feature/T<id>-<name>-<desc>` (or `fix/T<id>-…`) → commits start with the task ID
  (`T29 - Add category nav`) → PR into `dev`, squash-merged after 1 approval and green CI →
  `dev` merges to `main` only at milestones. Never commit or push to `main` or `dev` directly.
  Never force-push a shared branch. No long-lived personal branches.
- Every PR description lists the task ID and the RTM requirement IDs it covers (F1–F30).

## Business rules from the sponsor
- **Pickup only.** No delivery. Mon–Sat 11:00–21:00 Central; closed Sunday. Ordering is disabled
  outside business hours with an explanatory message.
- **Lead times:** 15 minutes minimum for regular items, 40 minutes for catering trays. A mixed
  order takes the **longer** of the two. Checkout has a pickup-time picker.
- **Tax:** 8.25% (Houston). Stored as a setting, not hard-coded.
- **Sizes:** fried rice sm/lg; catering trays S/M/L at $39.99 / $59.99 / $79.99. Price lives on the
  size row, not the item. Unsized items get a single "regular" size row.
- **Combination Plate (G1, $12.99):** the customer picks **two half orders from G2–G10**.
  The restaurant has **no G7 or G8**; codes match the printed menu exactly, gaps included. This is
  intentional — don't flag it or renumber.
- **Spicy:** any entrée can be made spicy on request. It's an option on the order line, not a
  separate item. The ★ on the menu is a display flag only.
- **Drinks:** one $1.50 item; the customer picks from the fridge at pickup.
- **Catering trays:** paid online up front, 40-minute minimum.
- **Payments:** card, Apple Pay, Google Pay via Stripe Checkout. Refunds are issued by the owner
  in Stripe's own dashboard, outside our system.
- **No-shows:** the ticket stays Ready; the owner closes it from the dashboard.
- **Reports are online orders only.** Walk-ins stay on the POS. Label every report accordingly.

## Order lifecycle
Two separate status columns (do not merge them):
- **payment_status:** `pending_payment` → `paid` → `refunded` / `cancelled`
- **ticket_status:** null until paid → `received` → `in_progress` → `ready` → `completed`

`ticket_status` must stay null while `payment_status` is `pending_payment` — an unpaid order must
never reach the kitchen. **The cashier/counter sets `completed`** when the food is handed over
(decided 6 Oct). Counter and kitchen share one view and one role.

## Data model (Charles's ERD, pending Program Manager approval 12 Oct)
`menu_categories` · `menu_items` (code, name, description, is_available, is_active, is_spicy_flag,
is_catering) · `item_sizes` (price lives here) · `price_change_log` · `orders` (display order
number, customer name, email, optional phone, pickup time, both statuses, subtotal/tax/total,
tax_rate snapshot, email_sent_at) · `order_lines` (size, qty, price snapshot, **name snapshot**,
spicy choice, instructions) · `order_line_components` (the two combo halves) · `payments` (Stripe
references only, unique constraint on session id) · `order_status_log` · `staff_users` (role) ·
`business_hours` · `settings`

**Do not write migrations against this until Charles's ERD is approved.** Build against types and
stubs; swap in the real schema after 12 Oct.

## Folder layout
```
app/
  (customer)/   menu, cart, checkout, order/[id]
  staff/        kitchen & counter ticket board
  owner/        orders, menu, reports
  api/
    orders/            POST create order + Stripe session
    webhooks/stripe/   payment confirmation (idempotent)
lib/            supabase clients, stripe, pricing, design tokens
supabase/       migrations + seed.sql
docs/           team docs, menu.csv, diagrams
```

## Known open items
- BR-08, BR-20, BR-23, BR-24, BR-26 — five proposed business rules still unapproved; they change
  columns. Blocking the ERD.
- RTM **F8** says checkout collects name + phone; it must say name + email (required) + phone
  (optional). Change-log item.
- RTM **F16** lists three ticket states; it needs `completed`. Change-log item.
