"use client";

import Link from "next/link";
import { btnPrimary, btnSecondary } from "@/lib/ui";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-5 px-6 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element -- tiny static logo from /public */}
      <img src="/brand/chopstix-mark.webp" alt="" width={96} height={96} className="h-24 w-24 rounded-full" />
      <h1 className="text-4xl font-black text-brand-blue">Something went wrong</h1>
      <p className="text-muted">Your cart is kept while this tab stays open. Try again, or call the restaurant if it keeps happening.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className={btnPrimary}>Try again</button>
        <Link href="/menu" className={btnSecondary}>Back to the menu</Link>
      </div>
    </main>
  );
}
