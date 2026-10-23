import Link from "next/link";
import { btnPrimary } from "@/lib/ui";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-5 px-6 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element -- tiny static logo from /public */}
      <img src="/brand/chopstix-mark.webp" alt="" width={96} height={96} className="h-24 w-24 rounded-full" />
      <h1 className="text-4xl font-black text-brand-blue">We can&apos;t find that page</h1>
      <p className="text-muted">The link may be old or mistyped.</p>
      <Link href="/menu" className={btnPrimary}>Back to the menu</Link>
    </main>
  );
}
