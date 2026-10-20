/**
 * Menu rules shared by the cart (browser) and the order API (server), so the two cannot drift.
 * Pure functions only: no imports, safe to load on either side.
 */

/**
 * Spicy is an option on the order line (decided 12-13 Oct). Allowed on every G, C and T item and on
 * all fried rice R1-R6, including R4 Steamed Rice. Not allowed on appetizers (A, including the
 * wings), soups (S) or drinks (B).
 */
export function allowsSpicy(itemCode: string): boolean {
  return /^(G|C|T|R)\d+$/.test(itemCode);
}
