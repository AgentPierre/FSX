"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const db = createClient();
      const result = await db.auth.signInWithPassword({ email: String(form.get("email")).trim(), password: String(form.get("password")) });
      if (result.error) throw new Error("Sign-in failed. Check your email and password.");
      const { data, error: roleError } = await db.from("staff_users").select("role").eq("id",result.data.user.id).maybeSingle();
      if (roleError || !data || !["owner","staff"].includes(data.role)) {
        await db.auth.signOut();
        throw new Error("This account has no restaurant staff access. Contact the project lead.");
      }
      router.replace(data.role === "owner" ? "/owner" : "/staff");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not sign in. Please try again.");
    } finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-md p-6">
    <h1 className="text-2xl font-bold">Staff sign in</h1>
    <p className="mt-2">Use the account provided by the restaurant owner or project lead.</p>
    <form onSubmit={signIn} className="mt-6 space-y-4">
      <label className="block">Email<input name="email" type="email" autoComplete="username" required className="mt-1 block w-full rounded border p-3" /></label>
      <label className="block">Password<input name="password" type="password" autoComplete="current-password" required className="mt-1 block w-full rounded border p-3" /></label>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <button disabled={busy} className="rounded bg-blue-900 px-4 py-3 text-white disabled:opacity-50">{busy ? "Signing in…" : "Sign in"}</button>
    </form>
  </main>;
}
