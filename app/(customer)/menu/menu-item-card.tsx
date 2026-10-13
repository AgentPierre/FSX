"use client";

import { formatCents } from "@/lib/money";
import { useCart } from "../cart-provider";
import { ItemCustomization } from "../item-customization";
import type { MenuItem } from "@/lib/types";

const SIZE_LABELS: Record<string, string> = {
  sm: "Small", lg: "Large", S: "Small", M: "Medium", L: "Large",
};

export function MenuItemCard({ item, comboOptions }: {
  item: MenuItem;
  comboOptions: MenuItem[];
}) {
  const { add } = useCart();
  return (
    <article aria-labelledby={`item-${item.id}`} className="h-full rounded-xl border border-[#1A3A8F]/20 bg-white p-5">
      <p className="font-mono text-sm text-[#6B6560]">{item.code}</p>
      <h3 id={`item-${item.id}`} className="mt-1 text-lg font-semibold text-[#1A3A8F]">{item.name}</h3>
      {item.isSpicyFlag && <p className="mt-2 text-sm font-semibold text-[#D32F2F]"><span aria-hidden="true">★ </span>Spicy</p>}
      {!item.isAvailable && <p className="mt-2 font-semibold text-[#6B6560]">Sold out — currently unavailable</p>}
      {item.description && <p className="mt-3 text-sm text-[#6B6560]">{item.description}</p>}
      <dl aria-label={`Prices for ${item.name}`} className="mt-4 space-y-2">
        {item.sizes.map((size) => (
          <div key={size.id} className="flex items-baseline justify-between gap-4">
            <dt className="text-sm">{size.name === "regular" ? "Price" : (SIZE_LABELS[size.name] ?? size.name)}</dt>
            <dd className="font-semibold text-[#D32F2F] tabular-nums">{formatCents(size.priceCents)}</dd>
          </div>
        ))}
      </dl>
      {item.code === "G1" && (
        <div className="mt-4 border-t border-[#1A3A8F]/20 pt-3 text-sm">
          <p className="font-semibold">Choose exactly two half orders. You may choose the same dish twice.</p>
          <ul className="mt-2 space-y-1 text-[#6B6560]">
            {comboOptions.map((option) => <li key={option.id}>{option.code} — {option.name}{!option.isAvailable && " (sold out)"}</li>)}
          </ul>
        </div>
      )}
      {item.isCatering && <p className="mt-3 text-sm text-[#6B6560]">Allow at least 40 minutes for pickup.</p>}
      <ItemCustomization item={item} onSave={add} />
    </article>
  );
}
