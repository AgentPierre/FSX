"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useReducer, useRef, useState } from "react";
import { CART_STORAGE_KEY, CART_VERSION, cartReducer, cartSubtotalCents, checkoutLines, restoreCart, selectionPayload, validateSelection } from "@/lib/cart";
import type { CartState, CartSelection } from "@/lib/cart";
import type { MenuCategory } from "@/lib/types";
import { formatCents } from "@/lib/money";

interface CartContextValue extends CartState {
  menu: MenuCategory[];
  subtotalCents: number | null;
  add: (selection: CartSelection) => void;
  edit: (id: string, selection: CartSelection) => void;
  remove: (id: string) => void;
  clear: () => void;
  prepareCheckoutLines: () => ReturnType<typeof checkoutLines>;
}
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ menu, children }: { menu: MenuCategory[]; children: React.ReactNode }) {
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
    <CartContext.Provider value={{ ...state, menu, subtotalCents,
      add: (selection) => dispatch({ type: "save", line: { id: crypto.randomUUID(), ...selectionPayload(selection) }, menu, editing: false }),
      edit: (id, selection) => dispatch({ type: "save", line: { id, ...selectionPayload(selection) }, menu, editing: true }),
      remove: (id) => dispatch({ type: "remove", id }), clear: () => dispatch({ type: "clear" }),
      prepareCheckoutLines: () => {
        if (!state.ready) throw new Error("Wait for the cart to finish restoring.");
        return checkoutLines(state.lines, menu);
      },
    }}>
      <div className="border-b bg-white px-4 py-3 text-[#1A3A8F]">
        <nav aria-label="Ordering navigation" className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <Link href="/menu" className="rounded p-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2">Menu</Link>
          <Link href="/cart" className="rounded p-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2">Cart {state.ready ? `(${count}) · ${subtotalLabel}` : "(loading…)"}</Link>
        </nav>
        <p role="status" className="mx-auto max-w-6xl text-sm text-[#1C1917]">{state.message && `${state.message} ${count} items, subtotal ${subtotalLabel}.`}</p>
        {invalidLines && <p role="alert" className="mx-auto max-w-6xl text-sm text-[#1C1917]">Some cart selections are no longer available. Review your cart before placing an order.</p>}
        {storageError && <p role="alert" className="mx-auto max-w-6xl text-sm text-[#1C1917]">{storageError}</p>}
      </div>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const cart = useContext(CartContext);
  if (!cart) throw new Error("useCart must be used within CartProvider.");
  return cart;
}
