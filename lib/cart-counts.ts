import type { CartLine } from "./cart";
import type { MenuCategory, MenuItem } from "./types";

/** The cart lines that belong to one menu item (any size or option), in the order they were added. */
export function linesForItem(lines: CartLine[], item: MenuItem): CartLine[] {
  const sizeIds = new Set(item.sizes.map((size) => size.id));
  return lines.filter((line) => sizeIds.has(line.sizeId));
}

export function quantityOf(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

/** How many items from each menu category are in the cart (for the count on each category tab). */
export function quantityByCategory(lines: CartLine[], categories: MenuCategory[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const category of categories) {
    const total = category.items.reduce((sum, item) => sum + quantityOf(linesForItem(lines, item)), 0);
    if (total > 0) counts.set(category.id, total);
  }
  return counts;
}
