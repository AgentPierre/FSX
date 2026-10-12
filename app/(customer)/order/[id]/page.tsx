export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Order {id}</h1>
      <p className="mt-2 text-sm opacity-70">Placeholder — order status</p>
    </main>
  );
}
