"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCart } from "../cart-provider";
import { MenuItemCard } from "./menu-item-card";
import { HeroArt } from "@/components/hero-art";
import { formatCents } from "@/lib/money";

export default function Page() {
  // The layout's server-fetched snapshot also drives customization and cart prices.
  const { menu, settings, lines, ready, subtotalCents } = useCart();
  const categories = menu
    .map((category) => ({ ...category, items: category.items.filter((item) => item.isActive) }))
    .filter((category) => category.items.length > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const [activeId, setActiveId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // A shared link like /menu#category-<id> opens that category.
  useEffect(() => {
    const fromHash = window.location.hash.replace("#category-", "");
    if (fromHash) setActiveId(fromHash);
  }, []);
  const activeIndex = Math.max(0, categories.findIndex((category) => category.id === activeId));
  const active = categories[activeIndex];
  function choose(id: string) {
    setActiveId(id);
    window.history.replaceState(null, "", `#category-${id}`);
    // Tabs stay put; if the customer had scrolled down the list, bring the new list to the top.
    const panel = panelRef.current;
    if (panel && panel.getBoundingClientRect().top < 0) panel.scrollIntoView({ block: "start" });
  }
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  return (
    <main className="min-h-screen pb-24 sm:pb-0">
      <a href="#menu-items" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-30 focus:rounded focus:bg-white focus:p-4 focus:text-brand-blue focus:outline-2 focus:outline-offset-2">Skip to menu</a>
      <header className="overflow-hidden border-b-2 border-ink bg-brand-red">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-6 sm:px-6 sm:py-10">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-white sm:text-sm">Family kitchen · 6755 Hillcroft St, Houston</p>
            <h1 className="mt-2 text-[2.5rem] font-black leading-[0.95] tracking-tight text-white sm:text-7xl">
              Order for <span className="italic text-sun">pickup</span>
            </h1>
            <ul className="mt-4 flex flex-wrap gap-2 text-sm font-bold text-ink sm:mt-5 sm:gap-2.5 sm:text-base">
              {settings ? (
                <>
                  <li className="rounded-full border-2 border-ink bg-mustard px-3 py-0.5 sm:px-4 sm:py-1">Ready in {settings.leadRegularMinutes}+ min</li>
                  <li className="rounded-full border-2 border-ink bg-white px-3 py-0.5 sm:px-4 sm:py-1">Catering trays: {settings.leadCateringMinutes}+ min</li>
                </>
              ) : (
                <li className="rounded-full border-2 border-ink bg-white px-3 py-0.5 sm:px-4 sm:py-1">Pickup lead times are unavailable. Refresh the page.</li>
              )}
            </ul>
          </div>
          <HeroArt className="w-24 shrink-0 sm:w-72" />
        </div>
      </header>
      {categories.length > 0 && (
        <nav aria-label="Menu categories" className="sticky top-0 z-10 border-y-2 border-ink bg-cream/95 backdrop-blur-sm">
          <ul className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-3 sm:px-6">
            {categories.map((category) => {
              const selected = category.id === active?.id;
              return (
                <li key={category.id} className="shrink-0">
                  <button
                    type="button"
                    aria-current={selected ? "true" : undefined}
                    onClick={() => choose(category.id)}
                    className={`min-h-11 rounded-full border-2 border-ink px-4 py-2 text-sm font-bold motion-safe:transition-all motion-safe:duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue sm:text-base ${selected ? "-translate-y-0.5 bg-brand-red text-white shadow-[3px_3px_0_0_var(--color-ink)]" : "bg-paper hover:bg-tile"}`}
                  >
                    {category.name}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
      <div id="menu-items" ref={panelRef} tabIndex={-1} className="mx-auto max-w-6xl scroll-mt-20 px-4 py-6 sm:px-6">
        {categories.length === 0 && <p>Our menu is currently unavailable. Please check back soon.</p>}
        {active && (
          <section key={active.id} aria-labelledby="active-category">
            <h2 id="active-category" className="mb-4 flex items-baseline gap-3 text-3xl font-black text-brand-blue">
              {active.name}
              <span className="font-sans text-sm font-semibold text-muted">{active.items.length} {active.items.length === 1 ? "item" : "items"}</span>
            </h2>
            <ul className="grid grid-cols-2 items-stretch gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
              {active.items.map((item, index) => <li key={item.id}><MenuItemCard item={item} tone={activeIndex} index={index} /></li>)}
            </ul>
          </section>
        )}
      </div>
      {ready && count > 0 && (
        <Link href="/cart" className="sticker anim-pop fixed inset-x-4 bottom-4 z-20 flex min-h-14 items-center justify-between rounded-full bg-brand-blue px-6 font-bold text-white sm:hidden">
          <span>View cart ({count})</span>
          <span className="tabular-nums">{subtotalCents === null ? "" : formatCents(subtotalCents)}</span>
        </Link>
      )}
    </main>
  );
}
