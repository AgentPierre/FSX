import { getMenu } from "@/lib/data";
import { formatCents } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function Page() {
  const categories = await getMenu();
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Menu</h1>
      <p className="mt-2 text-sm opacity-70">
        Placeholder — reads sample data from the stub store.
      </p>
      {categories.map((cat) => (
        <section key={cat.id} className="mt-6">
          <h2 className="text-lg font-semibold">{cat.name}</h2>
          <ul className="mt-2 space-y-1">
            {cat.items
              .filter((i) => i.isActive)
              .map((item) => (
                <li key={item.id}>
                  <span className="font-mono text-xs opacity-60">
                    {item.code}
                  </span>{" "}
                  {item.name}
                  {!item.isAvailable && " (sold out)"} —{" "}
                  {item.sizes
                    .map((s) =>
                      s.name === "regular"
                        ? formatCents(s.priceCents)
                        : `${s.name} ${formatCents(s.priceCents)}`,
                    )
                    .join(" / ")}
                </li>
              ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
