import Link from "next/link";

export default function Page() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Owner Dashboard</h1>
      <p className="mt-2 text-sm text-muted">Review online orders and their payment and pickup details.</p>
      <Link href="/owner/orders" className="mt-6 inline-flex min-h-11 items-center rounded border-2 border-ink bg-paper px-5 py-2 font-bold text-brand-blue underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-blue">View order history →</Link>
    </main>
  );
}
