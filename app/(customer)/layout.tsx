import { Suspense } from "react";
import { getMenu, store } from "@/lib/data";
import { CartProvider } from "./cart-provider";

export const dynamic = "force-dynamic";

async function CustomerData({ children }: { children: React.ReactNode }) {
  const [menu, settings, businessHours] = await Promise.all([
    getMenu(),
    store.getSettings().catch((error: unknown) => {
      console.error("Could not load pickup settings", error);
      return null;
    }),
    store.getBusinessHours().catch((error: unknown) => {
      console.error("Could not load business hours", error);
      return null;
    }),
  ]);
  return <CartProvider menu={menu} settings={settings} businessHours={businessHours}>{children}</CartProvider>;
}

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<p role="status" className="p-8">Loading the menu and pickup information…</p>}>
    <CustomerData>{children}</CustomerData>
  </Suspense>;
}
