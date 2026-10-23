/**
 * Pulls an allergen warning such as "Contains peanuts" out of a menu description, so the menu can show
 * it as its own badge and never lose it when a long description is cut short on a small card.
 */
export function allergenNotice(description: string | null | undefined): string | null {
  const match = description?.match(/\bContains\s+([^.]+?)\s*\./i);
  return match ? `Contains ${match[1]}` : null;
}
