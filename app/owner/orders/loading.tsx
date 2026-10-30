export default function Loading() {
  return <main className="mx-auto max-w-7xl p-6 sm:p-10" aria-busy="true">
    <h1 className="text-3xl font-bold">Order history</h1>
    <p role="status" className="mt-4">Loading orders…</p>
  </main>;
}
