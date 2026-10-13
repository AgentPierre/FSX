"use client";

import { useCart } from "../cart-provider";
import { MenuItemCard } from "./menu-item-card";

export const dynamic = "force-dynamic";

export default function Page() {
  // The layout's server-fetched snapshot also drives customization and cart prices.
  const { menu } = useCart();
  const categories = menu
    .map((category) => ({ ...category, items: category.items.filter((item) => item.isActive) }))
    .filter((category) => category.items.length > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  // Use existing active codes only: G7 and G8 intentionally do not exist.
  const comboOptions = categories.flatMap((category) => category.items)
    .filter((item) => /^G(?:[2-6]|9|10)$/.test(item.code));
  return (
    <main className="min-h-screen bg-[#FDF6EC] text-[#1C1917]">
      <a href="#menu-categories" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-20 focus:rounded focus:bg-white focus:p-4 focus:text-[#1A3A8F] focus:outline-2 focus:outline-offset-2">Skip to menu</a>
      <header className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <p className="font-semibold text-[#D32F2F]">Menciu&apos;s Chopstix</p>
        <h1 className="mt-2 text-3xl font-bold text-[#1A3A8F] sm:text-4xl">Our menu</h1>
        <p className="mt-3">Chinese-American favorites, freshly prepared for pickup.</p>
        <p className="mt-2 text-sm text-[#6B6560]">6755 Hillcroft St, Houston · Monday–Saturday, 11 am–9 pm Central · Closed Sunday</p>
        <p className="mt-3 text-sm">Any entrée can be made spicy on request. Regular orders need at least 15 minutes; catering trays need 40 minutes.</p>
      </header>
      {categories.length > 0 && (
        <nav aria-label="Menu categories" className="sticky top-0 z-10 border-y border-[#1A3A8F]/20 bg-[#FDF6EC]">
          <ul className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-3 sm:px-6">
            {categories.map((category) => (
              <li key={category.id} className="shrink-0">
                <a href={`#category-${category.id}`} className="inline-flex min-h-11 items-center rounded-lg px-3 py-2 font-semibold text-[#1A3A8F] hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A3A8F]">{category.name}</a>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <div id="menu-categories" tabIndex={-1} className="mx-auto max-w-6xl scroll-mt-24 space-y-10 px-4 py-8 sm:px-6">
        {categories.length === 0 && <p>Our menu is currently unavailable. Please check back soon.</p>}
        {categories.map((category) => (
          <section key={category.id} id={`category-${category.id}`} aria-labelledby={`heading-${category.id}`} className="scroll-mt-24">
            <h2 id={`heading-${category.id}`} className="mb-4 text-2xl font-bold text-[#1A3A8F]">{category.name}</h2>
            <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {category.items.map((item) => <li key={item.id}><MenuItemCard item={item} comboOptions={comboOptions} /></li>)}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
