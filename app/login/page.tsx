"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { btnPrimary } from "@/lib/ui";

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
  return (
    <main className="mx-auto w-full max-w-lg px-4 py-8 text-ink sm:px-6 sm:py-12">
      <div className="rounded-2xl border-2 border-ink bg-paper p-5 sm:p-8">
        <h1 id="login-heading" className="font-heading text-3xl font-bold text-brand-blue sm:text-4xl">
          Staff sign in
        </h1>
        <p id="login-help" className="mt-3 leading-relaxed text-muted">
          Use the account provided by the restaurant owner or project lead.
        </p>
        <form
          onSubmit={signIn}
          aria-labelledby="login-heading"
          aria-describedby={error ? "login-help login-error" : "login-help"}
          aria-busy={busy}
          className="mt-6 space-y-5"
        >
          <label className="block font-semibold">
            Email
            <input
              name="email"
              type="email"
              autoComplete="username"
              required
              className="mt-2 block min-h-12 w-full min-w-0 rounded-xl border-2 border-ink bg-cream px-3 py-2 text-base font-normal focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-blue"
            />
          </label>
          <label className="block font-semibold">
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="mt-2 block min-h-12 w-full min-w-0 rounded-xl border-2 border-ink bg-cream px-3 py-2 text-base font-normal focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-blue"
            />
          </label>
          {error && (
            <p id="login-error" role="alert" className="break-words rounded-xl border-2 border-brand-red-dark p-3 leading-relaxed text-brand-red-dark">
              {error}
            </p>
          )}
          <button disabled={busy} aria-label="Sign in" className={`${btnPrimary} w-full`}>
            <span aria-hidden="true">{busy ? "Signing in…" : "Sign in"}</span>
          </button>
        </form>
        {/* Keep one loading announcement outside the busy form. */}
        <p role="status" className="sr-only">{busy ? "Signing in…" : ""}</p>
      </div>
    </main>
  );
}
