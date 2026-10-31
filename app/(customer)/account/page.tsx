"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { itemsSummary, orderStatusLabel, pickupLabel } from "@/lib/customer-accounts";
import { formatCents } from "@/lib/money";
import type { PublicOrder } from "@/lib/public-order";
import { createClient } from "@/lib/supabase/browser";
import { btnPrimary, btnSecondary, pill } from "@/lib/ui";

type State = { kind: "loading" } | { kind: "error" } | { kind: "ready"; orders: PublicOrder[] };

/** "My orders": what the signed-in customer ordered while signed in. Each row opens the normal order page. */
export default function MyOrdersPage() {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [email, setEmail] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch("/api/account/orders", { cache: "no-store" });
        if (!active) return;
        if (response.status === 401) {
          router.replace("/account/sign-in");
          return;
        }
        if (!response.ok) throw new Error("orders unavailable");
        const body = (await response.json()) as { orders: PublicOrder[] };
        if (active) setState({ kind: "ready", orders: body.orders });
      } catch {
        if (active) setState({ kind: "error" });
      }
    })();
    return () => { active = false; };
  }, [router, attempt]);

  // Display only; the orders above come from the server, which verifies the session itself.
  useEffect(() => {
    try {
      createClient().auth.getSession()
        .then(({ data }) => setEmail(data.session?.user.email ?? ""))
        .catch(() => {});
    } catch {
      // No Supabase settings in this environment.
    }
  }, []);

  async function signOut() {
    try {
      await createClient().auth.signOut();
    } catch {
      // Leave the page either way.
    }
    router.replace("/menu");
    router.refresh();
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 text-ink sm:px-6 sm:py-12">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-heading text-3xl font-bold text-brand-blue sm:text-4xl">My orders</h1>
          {email && <p className="mt-1 break-words text-muted">Signed in as {email}</p>}
        </div>
        <button type="button" onClick={signOut} className={btnSecondary}>Sign out</button>
      </div>

      {state.kind === "loading" && <p role="status" className="mt-8 text-lg font-bold text-brand-blue">Loading your orders…</p>}

      {state.kind === "error" && (
        <div role="alert" className="mt-8 rounded-2xl border-2 border-brand-red-dark p-5">
          <p className="leading-relaxed text-brand-red-dark">We could not load your orders. Please try again.</p>
          <button type="button" className={`${btnPrimary} mt-4`} onClick={() => { setState({ kind: "loading" }); setAttempt((n) => n + 1); }}>
            Try again
          </button>
        </div>
      )}

      {state.kind === "ready" && state.orders.length === 0 && (
        <div className="mt-8 rounded-2xl border-2 border-ink bg-paper p-5 sm:p-8">
          <p className="text-lg font-bold">No orders yet.</p>
          <p className="mt-2 leading-relaxed text-muted">
            Orders you place while signed in show up here. Orders from before you signed in do not.
          </p>
          <Link href="/menu" className={`${btnPrimary} mt-5`}>See the menu</Link>
        </div>
      )}

      {state.kind === "ready" && state.orders.length > 0 && (
        <ul className="mt-8 space-y-4">
          {state.orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/order/${order.id}`}
                className="block rounded-2xl border-2 border-ink bg-paper p-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-blue sm:p-5"
              >
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-lg font-black">Order #{order.orderNumber}</span>
                  <span className={`${pill} bg-cream text-sm`}>{orderStatusLabel(order)}</span>
                </span>
                <span className="mt-2 block text-sm text-muted">Pickup {pickupLabel(order.pickupTime)} (Houston time)</span>
                <span className="mt-2 block break-words leading-relaxed">{itemsSummary(order)}</span>
                <span className="mt-2 block font-bold tabular-nums">{formatCents(order.totalCents)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
