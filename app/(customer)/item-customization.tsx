"use client";

import { useEffect, useId, useRef, useState } from "react";
import { menuItems, supportsSpicy, validateSelection } from "@/lib/cart";
import type { CartSelection } from "@/lib/cart";
import type { MenuItem } from "@/lib/types";
import { formatCents } from "@/lib/money";
import { useCart } from "./cart-provider";
import { sizeLabel } from "@/lib/menu-display";
import { btnPrimary, btnSecondary } from "@/lib/ui";

const chip =
  "inline-flex min-h-11 cursor-pointer items-center rounded-full border-2 border-ink bg-paper px-4 py-1.5 text-sm font-semibold motion-safe:transition-colors peer-checked:bg-brand-blue peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-blue peer-disabled:cursor-not-allowed peer-disabled:opacity-50";

/**
 * The options form for one dish: size, combo halves, spicy, a note, quantity, and the Add button.
 * Used inside the menu's add-to-cart sheet and inline when editing a cart line.
 * `onAdded` fires once the cart has accepted a brand-new line (the sheet closes itself then).
 */
export function ItemCustomization({ item, initial, onSave, onCancel, onAdded, inSheet = false, focusOnMount = false }: {
  item: MenuItem; initial?: CartSelection;
  onSave: (selection: CartSelection) => void; onCancel?: () => void;
  onAdded?: () => void;
  /** True inside the add-to-cart sheet: pins the quantity and Add row to the bottom of the sheet. */
  inSheet?: boolean;
  focusOnMount?: boolean;
}) {
  const { menu, ready, lines } = useCart();
  const id = useId();
  const [sizeId, setSizeId] = useState(initial?.sizeId ?? item.sizes[0]?.id ?? "");
  const [spicy, setSpicy] = useState(initial?.spicy ?? false);
  const [instructions, setInstructions] = useState(initial?.instructions ?? "");
  const [noteOpen, setNoteOpen] = useState(Boolean(initial?.instructions));
  const [quantity, setQuantity] = useState(initial?.quantity ?? 1);
  const [halves, setHalves] = useState(initial?.components ?? ["", ""]);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);
  const pendingAdd = useRef<{ ids: Set<string>; selection: CartSelection } | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onAddedRef = useRef(onAdded);
  useEffect(() => { onAddedRef.current = onAdded; });
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
    onAddedRef.current?.();
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
  const size = item.sizes.find((candidate) => candidate.id === sizeId);
  const total = size ? formatCents(size.priceCents * quantity) : "";
  const disabled = !ready || !item.isAvailable || !item.isActive;
  const setQty = (next: number) => setQuantity(Math.min(50, Math.max(1, next)));
  const label = "mb-2 text-sm font-bold uppercase tracking-wide text-muted";
  const stepButton = "flex h-11 w-11 items-center justify-center rounded-full text-2xl font-bold enabled:hover:bg-tile focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue disabled:opacity-30";
  return (
    <form ref={formRef} aria-label={`Customize ${item.name}`} onInvalid={() => { setAdded(false); pendingAdd.current = null; }} onSubmit={(event) => {
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
      <fieldset disabled={disabled} className="min-w-0 space-y-5 disabled:opacity-60">
        <legend className="sr-only">{initial ? "Edit options" : "Item options"}</legend>
        {item.sizes.length > 1 && <fieldset>
          <legend className={label}>Size</legend>
          <div className="flex flex-wrap gap-2">
            {item.sizes.map((option) => <label key={option.id} className="relative">
              <input type="radio" name={`${id}-size`} className="peer sr-only" checked={sizeId === option.id} onChange={() => setSizeId(option.id)} />
              <span className={chip}>{sizeLabel(option.name)}&nbsp;·&nbsp;<span className="tabular-nums">{formatCents(option.priceCents)}</span></span>
            </label>)}
          </div>
        </fieldset>}
        {item.code === "G1" && [0, 1].map((index) => <fieldset key={index}>
          <legend className={label}>Half order {index + 1}</legend>
          <div className="flex flex-wrap gap-2">
            {options.map((option) => <label key={option.id} className="relative">
              <input type="radio" name={`${id}-half-${index}`} required className="peer sr-only" disabled={!option.isAvailable}
                checked={halves[index] === option.code}
                onChange={() => setHalves((current) => current.map((code, position) => position === index ? option.code : code))} />
              <span className={chip}>{option.name}{!option.isAvailable && " (sold out)"}</span>
            </label>)}
          </div>
        </fieldset>)}
        {supportsSpicy(item) && <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-2xl border-2 border-ink bg-paper px-4">
          <span className="font-semibold">Make it spicy</span>
          <input type="checkbox" role="switch" checked={spicy} onChange={(event) => setSpicy(event.target.checked)} className="peer sr-only" />
          <span aria-hidden="true" className="relative h-7 w-12 shrink-0 rounded-full border-2 border-ink bg-tile motion-safe:transition-colors peer-checked:bg-brand-red peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-blue after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border-2 after:border-ink after:bg-white after:transition-transform peer-checked:after:translate-x-5" />
        </label>}
        {noteOpen ? <div>
          <label htmlFor={`${id}-instructions`} className={`block ${label}`}>Note for the kitchen</label>
          <textarea id={`${id}-instructions`} value={instructions} maxLength={200} rows={2} placeholder="No onions, extra sauce…" aria-describedby={`${id}-hint`}
            className="block w-full rounded-2xl border-2 border-ink bg-paper p-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue" onChange={(event) => setInstructions(event.target.value)} />
          <p id={`${id}-hint`} className="mt-1 text-right text-xs text-muted">{instructions.length}/200</p>
        </div> : <button type="button" onClick={() => setNoteOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-full px-1 font-semibold text-brand-blue underline decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue">
          <span aria-hidden="true">+</span> Add a note for the kitchen
        </button>}
      </fieldset>
      <p role="alert" className="mt-3 text-sm font-semibold text-brand-red-dark">{error}</p>
      <div className={`mt-4 flex flex-wrap items-center gap-3 ${inSheet ? "sticky bottom-0 -mx-5 border-t-2 border-ink bg-cream px-5 py-4" : "py-2"}`}>
        <div role="group" aria-label="Quantity" className="flex items-center rounded-full border-2 border-ink bg-paper">
          <button type="button" disabled={disabled || quantity <= 1} aria-label="Decrease quantity" onClick={() => setQty(quantity - 1)} className={stepButton}>−</button>
          <output aria-live="polite" className="min-w-8 text-center text-lg font-bold tabular-nums">{quantity}</output>
          <button type="button" disabled={disabled || quantity >= 50} aria-label="Increase quantity" onClick={() => setQty(quantity + 1)} className={stepButton}>+</button>
        </div>
        <button type="submit" disabled={disabled} className={`${btnPrimary} min-w-0 flex-1`}>
          {initial ? "Save changes" : added ? "Added ✓" : "Add to cart"}
          {total && <span className="rounded-full bg-black/20 px-2 py-0.5 tabular-nums">{total}</span>}
        </button>
        {onCancel && <button type="button" onClick={onCancel} className={`${btnSecondary} w-full`}>Cancel editing</button>}
      </div>
    </form>
  );
}
