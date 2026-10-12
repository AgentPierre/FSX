// All money is integer cents. Tax rate is basis points (825 = 8.25%).
export function taxCents(subtotalCents: number, taxRateBps: number): number {
  return Math.round((subtotalCents * taxRateBps) / 10_000);
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
