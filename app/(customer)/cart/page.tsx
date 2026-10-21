"use client";

import Link from "next/link";
import { useState } from "react";
import { menuItems, resolveSize, validateSelection } from "@/lib/cart";
import { formatCents } from "@/lib/money";
import { useCart } from "../cart-provider";
import { ItemCustomization } from "../item-customization";
import { sizeLabel } from "@/lib/menu-display";

export default function Page() {
  const cart = useCart();
  const [editing, setEditing] = useState<string | null>(null);
  function focusAfterUpdate(id: string) {
    requestAnimationFrame(() => document.getElementById(id)?.focus());
  }
  const button = "min-h-11 rounded border border-[#1A3A8F] bg-white px-3 py-2 text-[#1A3A8F] enabled:hover:bg-[#1A3A8F]/10 enabled:active:bg-[#1A3A8F] enabled:active:text-white motion-safe:transition-colors motion-safe:duration-150 disabled:cursor-not-allowed disabled:border-[#6B6560]/40 disabled:bg-stone-100 disabled:text-[#6B6560] focus-visible:ring-4 focus-visible:ring-[#1A3A8F]/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A3A8F]";
  const destructiveButton = "min-h-11 rounded border border-[#B91C1C] bg-white px-3 py-2 text-[#B91C1C] enabled:hover:bg-red-50 enabled:active:bg-[#B91C1C] enabled:active:text-white motion-safe:transition-colors motion-safe:duration-150 disabled:cursor-not-allowed disabled:border-[#6B6560]/40 disabled:bg-stone-100 disabled:text-[#6B6560] focus-visible:ring-4 focus-visible:ring-red-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B91C1C]";
  return (
    <main className="min-h-screen bg-[#FDF6EC] px-4 py-8 text-[#1C1917] sm:px-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold text-[#1A3A8F]">Your cart</h1>
        <Link id="continue-browsing" href="/menu" className="mt-3 inline-flex min-h-11 items-center rounded text-[#1A3A8F] underline focus-visible:outline-2 focus-visible:outline-offset-2">Continue browsing</Link>
        {!cart.ready ? <p role="status">Restoring your cart…</p> : cart.lines.length === 0 ? <p className="mt-6">Your cart is empty. Browse the menu to add your favorites.</p> : (
          <>
            <ul className="mt-6 space-y-4">
              {cart.lines.map((line, index) => {
                const hit = resolveSize(cart.menu, line.sizeId);
                const error = validateSelection(line, cart.menu);
                const name = hit?.item.name ?? "Unavailable item";
                return <li key={line.id} className="rounded-xl border border-[#1A3A8F]/20 bg-white p-4 sm:p-6">
                  <article id={`cart-entry-${line.id}`} tabIndex={-1} aria-labelledby={`cart-line-${line.id}`} className="rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A3A8F]">
                    <div className="flex flex-wrap justify-between gap-3">
                      <h2 id={`cart-line-${line.id}`} className="text-xl font-semibold text-[#1A3A8F]">{hit?.item.code} {name}</h2>
                      <p className="font-semibold tabular-nums">{hit ? formatCents(hit.size.priceCents * line.quantity) : "Price unavailable"}</p>
                    </div>
                    {hit && <p className="mt-2 text-sm">{hit.size.name !== "regular" && `Size: ${sizeLabel(hit.size.name)} · `}{formatCents(hit.size.priceCents)} each</p>}
                    {line.components.length > 0 && <p className="mt-2 text-sm">Half orders: {line.components.map((code) => `${code} — ${menuItems(cart.menu).find((item) => item.code === code)?.name ?? "Unavailable"}`).join(" + ")}</p>}
                    {line.spicy && <p className="mt-2 text-sm">Make it spicy</p>}
                    {line.instructions && <p className="mt-2 break-words text-sm">Instructions: {line.instructions}</p>}
                    {error && <p role="alert" className="mt-2 text-sm text-[#B91C1C]">{error} Edit or remove this line before checkout.</p>}
                    {editing === line.id && hit ? <ItemCustomization key={line.id} item={hit.item} initial={line} focusOnMount onSave={(selection) => { cart.edit(line.id, selection); setEditing(null); focusAfterUpdate(`cart-edit-${line.id}`); }} onCancel={() => { setEditing(null); focusAfterUpdate(`cart-edit-${line.id}`); }} /> : (
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <div role="group" aria-label={`Quantity for ${name}, line ${index + 1}`} className="flex items-center gap-3">
                          <button type="button" className={button} disabled={line.quantity <= 1 || !!error} aria-label={`Decrease quantity for ${name}, line ${index + 1}`} onClick={() => cart.edit(line.id, { ...line, quantity: line.quantity - 1 })}>−</button>
                          <span className="tabular-nums">{line.quantity}</span>
                          <button type="button" className={button} disabled={line.quantity >= 50 || !!error} aria-label={`Increase quantity for ${name}, line ${index + 1}`} onClick={() => cart.edit(line.id, { ...line, quantity: line.quantity + 1 })}>+</button>
                        </div>
                        <button id={`cart-edit-${line.id}`} type="button" className={button} disabled={!hit} aria-label={`Edit ${name}, line ${index + 1}`} onClick={() => setEditing(line.id)}>Edit</button>
                        <button type="button" className={destructiveButton} aria-label={`Remove ${name}, line ${index + 1}`} onClick={() => {
                          cart.remove(line.id);
                          const neighbor = cart.lines[index + 1] ?? cart.lines[index - 1];
                          focusAfterUpdate(neighbor ? `cart-entry-${neighbor.id}` : "continue-browsing");
                        }}>Remove</button>
                      </div>
                    )}
                  </article>
                </li>;
              })}
            </ul>
            <div className="mt-6 rounded-xl bg-white p-6">
              <p className="flex flex-wrap justify-between gap-3 text-xl font-semibold"><span>Subtotal</span><span className="tabular-nums">{cart.subtotalCents === null ? "Price unavailable" : formatCents(cart.subtotalCents)}</span></p>
              <p className="mt-2 text-sm">Tax is excluded. Prices and availability are verified by the server when placing your order.</p>
              <button type="button" className={`${destructiveButton} mt-4`} onClick={() => { cart.clear(); setEditing(null); focusAfterUpdate("continue-browsing"); }}>Clear cart</button>
              {cart.lines.some((line) => validateSelection(line, cart.menu)) || cart.subtotalCents === null ? <button type="button" disabled className={`${button} ml-3 mt-4`}>Checkout unavailable — review cart</button> : <Link href="/checkout" className={`${button} ml-3 mt-4 inline-flex items-center`}>Checkout</Link>}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
