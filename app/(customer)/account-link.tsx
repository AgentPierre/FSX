"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { customerAccountsEnabled } from "@/lib/customer-accounts";
import { createClient } from "@/lib/supabase/browser";
import { pill } from "@/lib/ui";

/** Header link: "Sign in" for a guest, "My orders" once signed in. Absent until customer accounts are switched on. */
export function AccountLink({ className = "" }: { className?: string }) {
  const enabled = customerAccountsEnabled();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    try {
      const db = createClient();
      // Display only: reads the local session, never a security decision.
      db.auth.getSession().then(({ data }) => setSignedIn(!!data.session)).catch(() => {});
      const { data } = db.auth.onAuthStateChange((_event, session) => setSignedIn(!!session));
      return () => data.subscription.unsubscribe();
    } catch {
      // No Supabase settings here; the header keeps showing "Sign in".
    }
  }, [enabled]);

  if (!enabled) return null;
  return (
    <Link
      href={signedIn ? "/account" : "/account/sign-in"}
      className={`${pill} inline-flex min-h-11 items-center bg-paper text-sm text-brand-blue underline decoration-2 underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue ${className}`}
    >
      {signedIn ? "My orders" : "Sign in"}
    </Link>
  );
}
