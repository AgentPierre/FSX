import { getMenu } from "@/lib/data";
import { CartProvider } from "./cart-provider";

export const dynamic = "force-dynamic";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  return <CartProvider menu={await getMenu()}>{children}</CartProvider>;
}
