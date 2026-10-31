"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { credentialsError, MIN_PASSWORD_LENGTH } from "@/lib/customer-accounts";
import { createClient } from "@/lib/supabase/browser";
import { btnPrimary } from "@/lib/ui";

const field =
  "mt-2 block min-h-12 w-full min-w-0 rounded-xl border-2 border-ink bg-cream px-3 py-2 text-base font-normal focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-blue";
const textLink =
  "font-bold text-brand-blue underline decoration-2 underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue";

/** Customer sign-in and sign-up. Restaurant staff sign in at /login, which stays separate. */
export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const signUp = mode === "sign-up";
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");

  // Already signed in, for example after tapping the confirmation link in the email: go straight to the orders.
  useEffect(() => {
    let active = true;
    try {
      createClient().auth.getSession()
        .then(({ data }) => { if (active && data.session) router.replace("/account"); })
        .catch(() => {});
    } catch {
      // No Supabase settings in this environment; the form reports it on submit.
    }
    return () => { active = false; };
  }, [router]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email")).trim();
    const password = String(form.get("password"));
    try {
      if (signUp) {
        const problem = credentialsError(email, password);
        if (problem) throw new Error(problem);
      }
      let db;
      try {
        db = createClient();
      } catch {
        throw new Error("Accounts are not available right now. Please try again later.");
      }
      if (signUp) {
        const { data, error: failure } = await db.auth.signUp({
          email, password, options: { emailRedirectTo: `${window.location.origin}/account/sign-in` },
        });
        if (failure) throw new Error("Could not create the account. If you already have one, sign in instead.");
        if (data.session) {
          router.replace("/account");
          router.refresh();
        } else {
          setConfirmEmail(email);
        }
      } else {
        const { error: failure } = await db.auth.signInWithPassword({ email, password });
        if (failure) {
          throw new Error(/not confirmed/i.test(failure.message)
            ? "Confirm your email first: open the link we sent you, then sign in."
            : "Sign-in failed. Check your email and password.");
        }
        router.replace("/account");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (confirmEmail) {
    return (
      <main className="mx-auto w-full max-w-lg px-4 py-8 text-ink sm:px-6 sm:py-12">
        <div role="status" className="rounded-2xl border-2 border-ink bg-paper p-5 sm:p-8">
          <h1 className="font-heading text-3xl font-bold text-brand-blue sm:text-4xl">Check your email</h1>
          <p className="mt-3 break-words leading-relaxed">
            We sent a confirmation link to <strong>{confirmEmail}</strong>. Open it, then sign in.
          </p>
          <p className="mt-6">
            <Link href="/account/sign-in" className={textLink}>Go to sign in</Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-8 text-ink sm:px-6 sm:py-12">
      <div className="rounded-2xl border-2 border-ink bg-paper p-5 sm:p-8">
        <h1 id="account-heading" className="font-heading text-3xl font-bold text-brand-blue sm:text-4xl">
          {signUp ? "Create an account" : "Sign in"}
        </h1>
        <p id="account-help" className="mt-3 leading-relaxed text-muted">
          {signUp
            ? "An account lets you see the orders you place while signed in. You can still order as a guest."
            : "See the orders you placed while signed in."}
        </p>
        <form
          onSubmit={submit}
          aria-labelledby="account-heading"
          aria-describedby={error ? "account-help account-error" : "account-help"}
          aria-busy={busy}
          className="mt-6 space-y-5"
        >
          <label className="block font-semibold">
            Email
            <input name="email" type="email" autoComplete={signUp ? "email" : "username"} required className={field} />
          </label>
          <label className="block font-semibold">
            Password
            <input
              name="password"
              type="password"
              autoComplete={signUp ? "new-password" : "current-password"}
              required
              minLength={signUp ? MIN_PASSWORD_LENGTH : undefined}
              aria-describedby={signUp ? "password-rule" : undefined}
              className={field}
            />
            {signUp && (
              <span id="password-rule" className="mt-1 block text-sm font-normal text-muted">
                At least {MIN_PASSWORD_LENGTH} characters.
              </span>
            )}
          </label>
          {error && (
            <p id="account-error" role="alert" className="break-words rounded-xl border-2 border-brand-red-dark p-3 leading-relaxed text-brand-red-dark">
              {error}
            </p>
          )}
          <button disabled={busy} aria-label={signUp ? "Create account" : "Sign in"} className={`${btnPrimary} w-full`}>
            <span aria-hidden="true">{busy ? (signUp ? "Creating account…" : "Signing in…") : (signUp ? "Create account" : "Sign in")}</span>
          </button>
        </form>
        {/* One loading announcement, outside the busy form. */}
        <p role="status" className="sr-only">{busy ? (signUp ? "Creating account…" : "Signing in…") : ""}</p>
        <p className="mt-6 leading-relaxed">
          {signUp ? "Already have an account? " : "New here? "}
          <Link href={signUp ? "/account/sign-in" : "/account/sign-up"} className={textLink}>
            {signUp ? "Sign in" : "Create an account"}
          </Link>
          {" · "}
          <Link href="/menu" className={textLink}>Order as a guest</Link>
        </p>
      </div>
    </main>
  );
}
