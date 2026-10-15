"use client";

import { useEffect, useId, useRef, useState } from "react";
import { menuItems, supportsSpicy, validateSelection } from "@/lib/cart";
import type { CartSelection } from "@/lib/cart";
import type { MenuItem } from "@/lib/types";
import { formatCents } from "@/lib/money";
import { useCart } from "./cart-provider";
import { sizeLabel } from "@/lib/menu-display";

export function ItemCustomization({ item, initial, onSave, onCancel, focusOnMount = false }: {
  item: MenuItem; initial?: CartSelection;
  onSave: (selection: CartSelection) => void; onCancel?: () => void;
  focusOnMount?: boolean;
}) {
  const { menu, ready, lines } = useCart();
  const id = useId();
  const [sizeId, setSizeId] = useState(initial?.sizeId ?? item.sizes[0]?.id ?? "");
  const [spicy, setSpicy] = useState(initial?.spicy ?? false);
  const [instructions, setInstructions] = useState(initial?.instructions ?? "");
  const [quantity, setQuantity] = useState(initial?.quantity ?? 1);
  const [halves, setHalves] = useState(initial?.components ?? ["", ""]);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);
  const pendingAdd = useRef<{ ids: Set<string>; selection: CartSelection } | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const pending = pendingAdd.current;
    if (!pending) return;
    const accepted = lines.some((line) => !pending.ids.has(line.id)
      && line.sizeId === pending.selection.sizeId
      && line.quantity === pending.selection.quantity
      && line.spicy === pending.selection.spicy
      && line.instructions === pending.selection.instructions
      && JSON.stringify(line.components) === JSON.stringify(pending.selection.components));
    if (!accepted) return;
    pendingAdd.current = null;
    setAdded(true);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setAdded(false), 1600);
  }, [lines]);
  useEffect(() => () => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
  }, []);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!focusOnMount) return;
    // Only an explicitly opened editor moves focus; ordinary cart updates do not.
    const controls = formRef.current?.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement>("select, input, textarea, button");
    const firstEnabled = Array.from(controls ?? []).find((control) => !control.matches(":disabled"));
    firstEnabled?.focus();
  }, [focusOnMount]);
  const options = menuItems(menu).filter((candidate) => candidate.isActive && /^G(?:[2-6]|9|10)$/.test(candidate.code));
  const control = "mt-1 min-h-11 w-full rounded border border-[#6B6560] bg-white p-2 text-[#1C1917] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A3A8F]";
  return (
    <form ref={formRef} className="mt-4 space-y-3" aria-label={`Customize ${item.name}`} onInvalid={() => { setAdded(false); pendingAdd.current = null; }} onSubmit={(event) => {
      event.preventDefault();
      setAdded(false);
      pendingAdd.current = null;
      const selection: CartSelection = { sizeId, quantity, spicy, instructions: instructions.trim(), components: item.code === "G1" ? halves : [] };
      const problem = validateSelection(selection, menu) ?? (!initial && lines.length >= 30 ? "Cart can contain at most 30 lines." : null);
      if (problem) { setError(problem); return; }
      // Confirm the new line in context before displaying success.
      if (!initial) pendingAdd.current = { ids: new Set(lines.map((line) => line.id)), selection };
      onSave(selection);
      setError("");
    }}>
      <fieldset disabled={!ready || !item.isAvailable || !item.isActive} className="space-y-3 disabled:opacity-60">
        <legend className="font-semibold">{initial ? "Edit options" : "Item options"}</legend>
        {item.sizes.length > 1 && <div>
          <label htmlFor={`${id}-size`}>Size</label>
          <select id={`${id}-size`} className={control} value={sizeId} required onChange={(event) => setSizeId(event.target.value)}>
            {item.sizes.map((size) => <option key={size.id} value={size.id}>{sizeLabel(size.name)} — {formatCents(size.priceCents)}</option>)}
          </select>
        </div>}
        {item.code === "G1" && <fieldset className="space-y-3">
          <legend className="text-sm">Choose exactly two halves; the same dish may be chosen twice.</legend>
          {[0, 1].map((index) => <div key={index}>
            <label htmlFor={`${id}-half-${index}`}>Half order {index + 1}</label>
            <select id={`${id}-half-${index}`} className={control} value={halves[index] ?? ""} required onChange={(event) => setHalves((current) => current.map((code, position) => position === index ? event.target.value : code))}>
              <option value="">Choose a dish</option>
              {options.map((option) => <option key={option.id} value={option.code} disabled={!option.isAvailable}>{option.code} — {option.name}{!option.isAvailable && " (sold out)"}</option>)}
            </select>
          </div>)}
        </fieldset>}
        {supportsSpicy(item) && <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={spicy} onChange={(event) => setSpicy(event.target.checked)} className="h-5 w-5 accent-[#1A3A8F] focus-visible:outline-2 focus-visible:outline-offset-2" />Make it spicy</label>}
        <div><label htmlFor={`${id}-instructions`}>Special instructions (optional)</label>
          <textarea id={`${id}-instructions`} value={instructions} maxLength={200} rows={2} className={control} aria-describedby={`${id}-hint`} onChange={(event) => setInstructions(event.target.value)} />
          <p id={`${id}-hint`} className="text-sm">Maximum 200 characters.</p>
        </div>
        <div><label htmlFor={`${id}-quantity`}>Quantity</label><input id={`${id}-quantity`} type="number" min={1} max={50} required value={Number.isNaN(quantity) ? "" : quantity} className={control} onChange={(event) => setQuantity(event.target.valueAsNumber)} /></div>
        <button type="submit" className={`inline-flex min-h-11 min-w-36 items-center justify-center gap-2 rounded px-4 py-2 font-semibold text-white motion-safe:transition-colors motion-safe:duration-150 focus-visible:ring-4 focus-visible:ring-[#1A3A8F]/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A3A8F] disabled:cursor-not-allowed disabled:bg-[#6B6560] disabled:text-white ${added ? "bg-[#15803D] enabled:hover:bg-[#166534] enabled:active:bg-[#14532D]" : "bg-[#D32F2F] enabled:hover:bg-[#B91C1C] enabled:active:bg-[#991B1B]"}`}>
          {added && <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-5 w-5"><path d="m4 10 4 4 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          {initial ? "Save changes" : added ? "Added!" : "Add to cart"}
        </button>
      </fieldset>
      {onCancel && <button type="button" onClick={onCancel} className="min-h-11 rounded px-3 py-2 text-[#1A3A8F] underline hover:bg-[#1A3A8F]/10 active:bg-[#1A3A8F]/20 motion-safe:transition-colors motion-safe:duration-150 focus-visible:ring-4 focus-visible:ring-[#1A3A8F]/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A3A8F] disabled:cursor-not-allowed disabled:opacity-50">Cancel editing</button>}
      <p role="alert" className="text-sm text-[#B91C1C]">{error}</p>
    </form>
  );
}
