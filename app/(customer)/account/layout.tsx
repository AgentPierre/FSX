import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { customerAccountsEnabled } from "@/lib/customer-accounts";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Customer accounts are switched on with NEXT_PUBLIC_CUSTOMER_ACCOUNTS; until then these pages do not exist. */
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  if (!customerAccountsEnabled()) notFound();
  return children;
}
