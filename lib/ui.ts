// Shared button looks, so every screen uses the same red/blue "sticker" style (docs/DESIGN.md).
// Each already includes a 44px minimum height (WCAG 2.1 AA touch target) and a visible focus ring.
const base =
  "sticker inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2 font-bold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-blue disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none";

/** The one main action on a screen (Add, Place order). */
export const btnPrimary = `${base} bg-brand-red text-white`;
/** Secondary actions (Edit, Cancel). */
export const btnSecondary = `${base} bg-paper text-ink`;
