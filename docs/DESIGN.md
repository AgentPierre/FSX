# Design Direction — starting point

Draft, 7 Oct 2026. This is a first position to argue with, not a finished system. It will change
once the architecture team's documents land.

## The core idea
One platform, two voices. Toast and Clover both do this and it's why they feel coherent rather
than like two apps bolted together.

- **Customer side** — warm, appetising, branded. This is a restaurant, not a SaaS dashboard.
  Generous spacing, food-forward, the restaurant's own red and blue.
- **Staff side** (kitchen, counter, owner) — dense, high-contrast, fast. Read from three to six
  feet away in a hot kitchen, often at a glance. Big tap targets, status colour doing real work.

Same tokens, same components, different density and different emphasis. One `lib/design-tokens.ts`
drives both.

## Colour

Taken from the restaurant's existing printed menu, which already has a strong identity.

| Token | Value | Use |
|---|---|---|
| `brand-red` | `#D32F2F` | Primary actions, prices, the logo |
| `brand-blue` | `#1A3A8F` | Headings, category labels, nav |
| `cream` | `#FDF6EC` | Customer page background |
| `ink` | `#1C1917` | Body text |
| `muted` | `#6B6560` | Secondary text, descriptions |

Status colours for the staff view — these must be distinguishable at a glance and must not rely on
hue alone (accessibility, and kitchens have bad lighting):

| Status | Colour | Also signalled by |
|---|---|---|
| Received | amber `#B45309` | newest at top, elapsed timer |
| In progress | blue `#1D4ED8` | progress affordance |
| Ready | green `#15803D` | moves to its own column |
| Late | red `#B91C1C` | pulsing border, elapsed timer in red |

Check every pair against 4.5:1 before committing — RTM row 2.02 commits us to WCAG 2.1 AA.

## Type
- **Headings:** a warm humanist sans with personality. Candidates: Bricolage Grotesque, Hanken
  Grotesk, or Outfit. Not Inter — it's correct and completely anonymous.
- **Body and UI:** Inter or system stack. Here anonymity is a virtue.
- **Numbers:** tabular figures everywhere a price or a timer appears, so columns don't jitter.
- Scale: 12 / 14 / 16 / 20 / 24 / 32 / 48. Staff view starts one step larger.

## Cards
The menu item card is the workhorse — it appears 46 times on the menu page.
- Item code as a small muted monospace chip (G1, C7) — the restaurant and the customers both use
  these codes, so keep them visible
- Name at 16–18px semibold
- Description at 14px muted, clamped to two lines
- Price right-aligned, tabular, `brand-red`
- Spicy ★ inline after the name, with a text label for screen readers
- Size selector only where sizes exist — never show a control with one option

The kitchen ticket card is the other workhorse. DoorDash's tablet layout is the right reference:
status as a full-width coloured header, customer name large, elapsed time always visible, one
primary action button at the bottom of the card, and nothing else competing for attention.

## Motion
Restrained. Motion should explain a change, not decorate it.
- 150ms ease-out on hover and press
- 200ms fade-and-rise when a new ticket arrives, so the kitchen notices without being startled
- A brief highlight on the cart count when an item is added
- Respect `prefers-reduced-motion` — and this is also an RTM accessibility commitment

## Logo
The existing printed menu already has one: "CHOPSTIX" in heavy red display type with the noodle
bowl mark. Keep it. Redrawing a working family-restaurant logo is scope creep with no upside. What
we need is a clean digital version — the wordmark as SVG, a square avatar version for the browser
tab, and a horizontal lockup for the site header.

Ask the sponsor whether an original vector file exists before anyone traces it.

## What to decide first
1. Does the sponsor have the logo as a vector file, or only the printed menu?
2. Food photography — do we have any? It changes the menu card layout completely.
3. Heading typeface — pick one and commit; it's the single most identity-defining choice here.
