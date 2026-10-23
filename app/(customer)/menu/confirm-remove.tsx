"use client";

import { useEffect, useId, useRef } from "react";
import { btnPrimary, btnSecondary } from "@/lib/ui";

/**
 * "Remove it from your cart?" check, shown when the minus button would take an item's last unit out.
 * Native <dialog>: focus is trapped, Esc and a backdrop click both mean "keep it".
 */
export function ConfirmRemove({ name, onKeep, onRemove }: { name: string; onKeep: () => void; onRemove: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onKeep}
      onClick={(event) => { if (event.target === ref.current) ref.current?.close(); }}
      className="sheet m-auto w-[min(92vw,24rem)] rounded-3xl border-2 border-ink bg-cream p-6 text-ink shadow-[8px_8px_0_0_var(--color-ink)]"
    >
      <h2 id={titleId} className="text-2xl font-black leading-tight text-brand-blue">Remove {name}?</h2>
      <p className="mt-2 text-muted">It will be taken out of your cart.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" autoFocus onClick={() => ref.current?.close()} className={`${btnSecondary} flex-1`}>Keep it</button>
        <button type="button" onClick={onRemove} className={`${btnPrimary} flex-1`}>Remove</button>
      </div>
    </dialog>
  );
}
