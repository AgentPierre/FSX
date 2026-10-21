// Shared button looks, so every screen uses the same red/blue (docs/DESIGN.md).
// Each already includes a 44px minimum height (WCAG 2.1 AA touch target) and a visible focus ring.
const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 font-semibold motion-safe:transition-colors motion-safe:duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue disabled:cursor-not-allowed disabled:opacity-50";

/** The one main action on a screen (Add, Place order). */
export const btnPrimary = `${base} bg-brand-red text-white enabled:hover:bg-brand-red-dark`;
/** Secondary actions (Edit, Cancel). */
export const btnSecondary = `${base} border border-brand-blue bg-paper text-brand-blue enabled:hover:bg-brand-blue/10`;
