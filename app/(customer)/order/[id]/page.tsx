import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { store } from "@/lib/data";
import { toPublicOrder } from "@/lib/public-order";
import { OrderStatus } from "./order-status";

export const dynamic = "force-dynamic";

// The order link is the customer's access (see docs/api.md): keep it out of search engines and
// don't leak it to other sites through the Referer header.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await store.getOrder(id);
  if (!order) notFound();
  return (
    <main>
      <OrderStatus initial={toPublicOrder(order)} />
    </main>
  );
}
