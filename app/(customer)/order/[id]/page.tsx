import { notFound } from "next/navigation";
import { store } from "@/lib/data";
import { toPublicOrder } from "@/lib/public-order";
import { OrderStatus } from "./order-status";

export const dynamic = "force-dynamic";

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
