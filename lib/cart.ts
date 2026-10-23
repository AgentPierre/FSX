import { allowsSpicy } from "./menu-rules";
import type { CreateOrderInput, MenuCategory, MenuItem } from "./types";

export const CART_VERSION = 1;
export const CART_STORAGE_KEY = "chopstix-cart";
export const MAX_LINES = 30;
export const MAX_QUANTITY = 50;
export type CartSelection = Required<CreateOrderInput["lines"][number]>;
export interface CartLine extends CartSelection { id: string }

export interface CartState { lines: CartLine[]; ready: boolean; message: string }
export type CartAction = { type: "restore"; lines: CartLine[]; message: string }
  | { type: "save"; line: CartLine; menu: MenuCategory[]; editing: boolean }
  | { type: "remove"; id: string } | { type: "clear" };

/** Same dish with the same options: size, spicy, note and half orders. */
export function sameSelection(a: CartSelection, b: CartSelection): boolean {
  return a.sizeId === b.sizeId && a.spicy === b.spicy && a.instructions === b.instructions
    && a.components.length === b.components.length && a.components.every((code, i) => code === b.components[i]);
}

export function cartReducer(state: CartState, action: CartAction): CartState {
  if (action.type === "restore") return { lines: action.lines, ready: true, message: action.message };
  if (!state.ready) return state;
  if (action.type === "clear") return { ...state, lines: [], message: "Cart cleared." };
  if (action.type === "remove") return { ...state, lines: state.lines.filter((line) => line.id !== action.id), message: "Item removed." };
  const error = validateSelection(action.line, action.menu);
  if (error) return { ...state, message: error };
  if (action.editing && !state.lines.some((line) => line.id === action.line.id)) return { ...state, message: "This cart item no longer exists." };
  if (!action.editing) {
    const same = state.lines.find((line) => sameSelection(line, action.line));
    if (same) {
      const quantity = same.quantity + action.line.quantity;
      if (quantity > MAX_QUANTITY) return { ...state, message: "Quantity must be between 1 and 50." };
      return { ...state, lines: state.lines.map((line) => line === same ? { ...line, quantity } : line), message: "Item added to cart." };
    }
  }
  if (!action.editing && state.lines.length >= MAX_LINES) return { ...state, message: "Cart can contain at most 30 lines." };
  return { ...state, lines: action.editing ? state.lines.map((line) => line.id === action.line.id ? action.line : line) : [...state.lines, action.line], message: action.editing ? "Cart item updated." : "Item added to cart." };
}

export function supportsSpicy(item: MenuItem): boolean {
  // One rule shared with the order API (lib/menu-rules.ts).
  return allowsSpicy(item.code);
}

export function menuItems(menu: MenuCategory[]): MenuItem[] {
  return menu.flatMap((category) => category.items);
}

export function resolveSize(menu: MenuCategory[], sizeId: string) {
  for (const item of menuItems(menu)) {
    const size = item.sizes.find((candidate) => candidate.id === sizeId);
    if (size) return { item, size };
  }
  return undefined;
}

export function cartSubtotalCents(lines: CartLine[], menu: MenuCategory[]): number | null {
  let subtotal = 0;
  for (const line of lines) {
    const price = resolveSize(menu, line.sizeId)?.size.priceCents;
    // A removed size must never look like a free cart line.
    if (price === undefined || !Number.isSafeInteger(price) || price <= 0) return null;
    subtotal += price * line.quantity;
  }
  return subtotal;
}

export function validateSelection(value: unknown, menu: MenuCategory[]): string | null {
  if (!value || typeof value !== "object") return "Invalid cart item.";
  const line = value as Partial<CartSelection>;
  if (typeof line.sizeId !== "string") return "Choose a valid size.";
  const hit = resolveSize(menu, line.sizeId);
  if (!hit || !hit.item.isActive || !hit.item.isAvailable) return "This item or size is no longer available.";
  if (!Number.isSafeInteger(hit.size.priceCents) || hit.size.priceCents <= 0) return "This item has no valid price.";
  if (!Number.isInteger(line.quantity) || line.quantity! < 1 || line.quantity! > MAX_QUANTITY) return "Quantity must be between 1 and 50.";
  if (typeof line.spicy !== "boolean" || (line.spicy && !supportsSpicy(hit.item))) return "Invalid spicy preference.";
  if (typeof line.instructions !== "string" || line.instructions.length > 200) return "Instructions must be 200 characters or fewer.";
  if (!Array.isArray(line.components) || !line.components.every((code) => typeof code === "string")) return "Invalid half-order selections.";
  if (hit.item.code === "G1") {
    if (line.components.length !== 2 || !line.components.every((code) =>
      /^G(?:[2-6]|9|10)$/.test(code) && menuItems(menu).some((item) => item.code === code && item.isActive && item.isAvailable)
    )) return "Choose exactly two available half orders from G2–G10.";
  } else if (line.components.length !== 0) return "Only G1 accepts half-order selections.";
  return null;
}

// Explicit whitelist: neither persistence nor checkout carries display prices.
export function selectionPayload(line: CartSelection): CartSelection {
  return {
    sizeId: line.sizeId, quantity: line.quantity, spicy: line.spicy,
    instructions: line.instructions, components: [...line.components],
  };
}

export function checkoutLines(lines: CartLine[], menu: MenuCategory[]): CreateOrderInput["lines"] {
  if (lines.length === 0 || lines.length > MAX_LINES) throw new Error("Cart must contain 1–30 lines.");
  return lines.map((line) => {
    const error = validateSelection(line, menu);
    if (error) throw new Error(error);
    return selectionPayload(line);
  });
}

export function restoreCart(raw: string | null, menu: MenuCategory[]): { lines: CartLine[]; message: string } {
  if (!raw) return { lines: [], message: "" };
  try {
    const stored: unknown = JSON.parse(raw);
    if (!stored || typeof stored !== "object") throw new Error();
    const envelope = stored as { version?: unknown; lines?: unknown };
    if (envelope.version !== CART_VERSION || !Array.isArray(envelope.lines) || envelope.lines.length > MAX_LINES) throw new Error();
    const lines: CartLine[] = [];
    const ids = new Set<string>();
    for (const candidate of envelope.lines) {
      if (!candidate || typeof candidate !== "object" || typeof candidate.id !== "string" || candidate.id.length === 0 || candidate.id.length > 64 || ids.has(candidate.id) || validateSelection(candidate, menu)) continue;
      ids.add(candidate.id);
      lines.push({ id: candidate.id, ...selectionPayload(candidate) });
    }
    return { lines, message: lines.length !== envelope.lines.length ? "Some saved items were invalid or unavailable and were removed. Please review your cart." : "" };
  } catch {
    return { lines: [], message: "Your saved cart could not be restored. Please add your items again." };
  }
}
