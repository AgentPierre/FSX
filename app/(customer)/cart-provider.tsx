"use client";

import { createContext, useContext, useEffect, useReducer, useRef, useState } from "react";
import { CART_STORAGE_KEY, CART_VERSION, cartReducer, cartSubtotalCents, checkoutLines, restoreCart, selectionPayload, validateSelection } from "@/lib/cart";
import type { CartState, CartSelection } from "@/lib/cart";
import type { BusinessHour, MenuCategory, Settings } from "@/lib/types";
import { formatCents } from "@/lib/money";
import { SiteHeader } from "./site-header";

interface CartContextValue extends CartState {
  menu: MenuCategory[];
  settings: Settings | null;
  businessHours: BusinessHour[] | null;
  subtotalCents: number | null;
  add: (selection: CartSelection) => void;
  edit: (id: string, selection: CartSelection) => void;
  remove: (id: string) => void;
  clear: () => void;
  prepareCheckoutLines: () => ReturnType<typeof checkoutLines>;
}
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ menu, settings, businessHours, children }: {
  menu: MenuCategory[];
  settings: Settings | null;
  businessHours: BusinessHour[] | null;
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(cartReducer, { lines: [], ready: false, message: "" });
  const [storageError, setStorageError] = useState("");
  const restored = useRef(false);
  useEffect(() => {
    // Restore once. Later server menu refreshes must not replace in-memory edits.
    if (restored.current) return;
    restored.current = true;
    try {
      const restored = restoreCart(sessionStorage.getItem(CART_STORAGE_KEY), menu);
      dispatch({ type: "restore", ...restored });
    } catch {
      dispatch({ type: "restore", lines: [], message: "" });
      setStorageError("Cart storage is unavailable. Your cart will only last while this page stays open.");
    }
  }, [menu]);
  useEffect(() => {
    if (!state.ready) return;
    try {
      sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ version: CART_VERSION, lines: state.lines.map((line) => ({ id: line.id, ...selectionPayload(line) })) }));
    } catch {
      setStorageError("Your cart could not be saved. Keep this page open to retain your items.");
    }
  }, [state.lines, state.ready]);
  // Revalidate against new server snapshots without replacing saved selections.
  const invalidLines = state.lines.some((line) => validateSelection(line, menu));
  const subtotalCents = cartSubtotalCents(state.lines, menu);
  const subtotalLabel = subtotalCents === null ? "Price unavailable" : formatCents(subtotalCents);
  const count = state.lines.reduce((sum, line) => sum + line.quantity, 0);
  return (
    <CartContext.Provider value={{ ...state, menu, settings, businessHours, subtotalCents,
      add: (selection) => dispatch({ type: "save", line: { id: crypto.randomUUID(), ...selectionPayload(selection) }, menu, editing: false }),
      edit: (id, selection) => dispatch({ type: "save", line: { id, ...selectionPayload(selection) }, menu, editing: true }),
      remove: (id) => dispatch({ type: "remove", id }), clear: () => dispatch({ type: "clear" }),
      prepareCheckoutLines: () => {
        if (!state.ready) throw new Error("Wait for the cart to finish restoring.");
        return checkoutLines(state.lines, menu);
      },
    }}>
      <SiteHeader businessHours={businessHours} ready={state.ready} count={count} subtotalLabel={subtotalLabel}
        message={state.message} invalidLines={invalidLines} storageError={storageError} />
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const cart = useContext(CartContext);
  if (!cart) throw new Error("useCart must be used within CartProvider.");
  return cart;
}
