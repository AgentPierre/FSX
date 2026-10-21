"use client";

import { useCart } from "../cart-provider";
import { MenuItemCard } from "./menu-item-card";
import { businessHoursLabel } from "@/lib/menu-display";

export default function Page() {
  // The layout's server-fetched snapshot also drives customization and cart prices.
  const { menu, settings, businessHours } = useCart();
  const categories = menu
    .map((category) => ({ ...category, items: category.items.filter((item) => item.isActive) }))
    .filter((category) => category.items.length > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  return (
    <main className="min-h-screen">
      <a href="#menu-categories" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-30 focus:rounded focus:bg-white focus:p-4 focus:text-brand-blue focus:outline-2 focus:outline-offset-2">Skip to menu</a>
      <header className="mx-auto max-w-3xl px-4 pb-6 pt-8 sm:px-6 sm:pt-10">
        <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-brand-blue sm:text-5xl">
          Hungry? <span className="text-brand-red">Order for pickup.</span>
        </h1>
        <p className="mt-3 text-lg">Chinese-American favorites, freshly prepared at 6755 Hillcroft St, Houston.</p>
        <p className="mt-2 text-sm text-muted">{businessHours ? businessHoursLabel(businessHours) : "Business hours are currently unavailable. Please refresh the page."}</p>
        <p className="mt-2 text-sm text-muted">Any entrée can be made spicy on request. {settings
          ? `Regular orders need at least ${settings.leadRegularMinutes} minutes; catering trays need ${settings.leadCateringMinutes} minutes. Mixed orders take the longer lead time.`
          : "Pickup lead times are currently unavailable. Please refresh the page."}</p>
      </header>
      {categories.length > 0 && (
        <nav aria-label="Menu categories" className="sticky top-0 z-10 border-y-2 border-ink bg-cream">
          <ul className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-4 sm:px-6">
            {categories.map((category) => (
              <li key={category.id} className="shrink-0">
                <a href={`#category-${category.id}`} className="inline-flex min-h-11 items-center border-b-4 border-transparent px-3 py-2 font-bold text-ink hover:border-brand-red focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-blue">{category.name}</a>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <div id="menu-categories" tabIndex={-1} className="mx-auto max-w-3xl scroll-mt-24 space-y-10 px-4 py-8 sm:px-6">
        {categories.length === 0 && <p>Our menu is currently unavailable. Please check back soon.</p>}
        {categories.map((category) => (
          <section key={category.id} id={`category-${category.id}`} aria-labelledby={`heading-${category.id}`} className="scroll-mt-24">
            <h2 id={`heading-${category.id}`} className="border-b-2 border-ink pb-2 text-2xl font-extrabold text-brand-blue">{category.name}</h2>
            <ul className="divide-y divide-line">
              {category.items.map((item) => <li key={item.id}><MenuItemCard item={item} /></li>)}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
