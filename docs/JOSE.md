# Jose's Playbook — Developer (Customer Ordering Interface, Accessibility)

Hey Jose — read `CLAUDE.md` at the repo root first; Claude Code loads it automatically too.
This file is your task list plus copy-paste prompts.

## Setup (one time)
```bash
git clone https://github.com/hiabnegash-lang/FSX.git && cd FSX
git checkout dev
npm install
cp .env.example .env.local        # get values from Hiab — never commit this file
npm run dev
```
Every task: `git checkout dev && git pull` → `git checkout -b feature/T<id>-jose-<desc>` → build → PR
into `dev` → tag Hiab for review.

---

## Your tasks
| ID | Week | Due | Task | Role |
|----|------|-----|------|------|
| — | W3 | 19 Oct | **Design direction + customer mockup** (not a graded deliverable — see note) | Owner |
| T29 | W4 | 26 Oct | Customer ordering interface: menu browse and cart | **Owner** |
| T40 | W5 | 2 Nov | Checkout and confirmation flow, end to end with Stripe test mode | **Owner** |
| T41 | W5 | 2 Nov | Accessibility pass on customer-facing pages | **Owner** |
| T48 | W6 | 9 Nov | Accessibility review and fixes, recorded against WCAG 2.1 AA | **Owner** |
| T04 | W1 | done | Requirements matrix — functional | Support Hiab |
| T24 | W3 | 19 Oct | Repo structure and contribution guide | Support Hiab |
| T31 | W4 | 26 Oct | Stripe integration | Support Hiab |
| T34 | W4 | 26 Oct | Owner dashboard — order history | Support Perry |

**Note on the W3 design work:** this is not on the official project schedule. It is preparation so
that T29 in week 4 is assembly rather than invention. Treat it as internal prep, and don't let it
push anything that *is* a deliverable. Hiab is raising with Quincy whether it should be added
formally.

---

## Prompts

### W3 — Design direction (start here)
> Read CLAUDE.md and docs/DESIGN.md. Build a single static HTML page at docs/mockups/style-tile.html
> that shows the proposed design system for the customer ordering site: the color palette as
> labelled swatches with hex values, the type scale, button states, a menu item card, a cart line
> item, and a form field with its error state. No framework, no build step — one self-contained file
> I can open in a browser and show the team. Use the restaurant's existing red and blue from the
> printed menu as the starting point.

### W3 — Customer menu mockup
> Read CLAUDE.md and docs/menu.csv. Build a static mockup of the customer menu page as a
> self-contained HTML file in docs/mockups/menu.html using the real menu data — all 42 items with
> real names, codes and prices, grouped by category. Include: a sticky category nav, item cards
> showing code, name, description and price, a spicy indicator, a size selector on fried rice and
> catering trays, an "add to cart" affordance, and a cart summary. Mobile-first; it must look right
> at 390px wide. This is a visual mockup — no real cart logic yet.

### W4 — T29: the real menu and cart
> Read CLAUDE.md. Build the real customer menu and cart in the Next.js app, converting the mockup
> at docs/mockups/menu.html into React components under app/(customer). The menu reads from the
> database as a server component. Cart state lives in React context plus sessionStorage. Handle the
> cases CLAUDE.md describes: sizes on fried rice and trays, the Combination Plate's pick-two from
> G2–G10, the "make it spicy" option, and per-line special instructions. Unavailable items are shown
> but cannot be added. Display the running subtotal, but never send prices to the server — send item
> and size ids and quantities only.

### W5 — T40: checkout and confirmation
> Build the checkout flow: name, email (required), phone (optional), and a pickup-time picker
> restricted to business hours and respecting the lead-time rule in CLAUDE.md — 15 minutes for
> regular items, 40 if the order contains a catering tray. Validate with zod. On submit, call
> POST /api/orders and redirect to the Stripe Checkout URL it returns. Build /order/[id] showing the
> order number, items, total and live ticket status.

### W5 — T41: accessibility
> Do an accessibility pass on every customer-facing page targeting WCAG 2.1 Level AA. Check: a
> logical heading hierarchy, labels on every form control, 4.5:1 contrast minimum, full keyboard
> navigation with visible focus, aria-live on cart updates and errors, and alt text on images.
> Produce docs/accessibility-report.md listing what you checked, what you fixed and what remains.

### W6 — T48: accessibility review
> Re-run the accessibility checks and record the results in a spreadsheet, one row per WCAG 2.1 AA
> success criterion, with pass/fail and evidence. Fix what fails.

---

## Definition of done
- Works locally and on the dev preview
- PR into `dev`, reviewed by Hiab, listing the RTM IDs covered (F1–F10, F14 are mostly yours)
- No secrets committed, no prices trusted from the browser
- Jira card moved to Testing
