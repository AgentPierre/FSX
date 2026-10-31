"use client";

import { useEffect, useState } from "react";
import { customerAccountsEnabled } from "@/lib/customer-accounts";
import { createClient } from "@/lib/supabase/browser";

/** The signed-in customer's email for pre-filling forms, or "" for a guest. Display only: never a security decision. */
export function useAccountEmail(): string {
  const [email, setEmail] = useState("");
  useEffect(() => {
    if (!customerAccountsEnabled()) return;
    try {
      createClient().auth.getSession()
        .then(({ data }) => setEmail(data.session?.user.email ?? ""))
        .catch(() => {});
    } catch {
      // No Supabase settings in this environment: leave the field empty.
    }
  }, []);
  return email;
}
