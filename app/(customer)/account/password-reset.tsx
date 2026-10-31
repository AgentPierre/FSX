"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { emailError, MIN_PASSWORD_LENGTH, newPasswordError } from "@/lib/customer-accounts";
import { createClient } from "@/lib/supabase/browser";
import { btnPrimary } from "@/lib/ui";

const field =
  "mt-2 block min-h-12 w-full min-w-0 rounded-xl border-2 border-ink bg-cream px-3 py-2 text-base font-normal focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-blue";
const textLink =
  "font-bold text-brand-blue underline decoration-2 underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue";
const card = "rounded-2xl border-2 border-ink bg-paper p-5 sm:p-8";
const heading = "font-heading text-3xl font-bold text-brand-blue sm:text-4xl";
const errorBox = "break-words rounded-xl border-2 border-brand-red-dark p-3 leading-relaxed text-brand-red-dark";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-lg px-4 py-8 text-ink sm:px-6 sm:py-12">
      <div className={card}>{children}</div>
    </main>
  );
}

/** Step 1: ask for the emailed link. The answer never says whether an account exists. */
export function ForgotPasswordForm() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const email = String(new FormData(event.currentTarget).get("email")).trim();
    try {
      const problem = emailError(email);
      if (problem) throw new Error(problem);
      let db;
      try {
        db = createClient();
      } catch {
        throw new Error("Accounts are not available right now. Please try again later.");
      }
      const { error: failure } = await db.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/account/reset-password`,
      });
      if (failure) {
        throw new Error(failure.status === 429
          ? "Please wait a minute before asking for another link."
          : "We could not send the email. Please try again.");
      }
      setSentTo(email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (sentTo) {
    return (
      <Shell>
        <div role="status">
          <h1 className={heading}>Check your email</h1>
          <p className="mt-3 break-words leading-relaxed">
            If there is an account for <strong>{sentTo}</strong>, we sent a link to choose a new password. Open it on this
            device and browser.
          </p>
        </div>
        <p className="mt-6"><Link href="/account/sign-in" className={textLink}>Back to sign in</Link></p>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 id="forgot-heading" className={heading}>Forgot your password?</h1>
      <p id="forgot-help" className="mt-3 leading-relaxed text-muted">
        Enter the email you signed up with and we will send you a link to choose a new password.
      </p>
      <form
        onSubmit={submit}
        aria-labelledby="forgot-heading"
        aria-describedby={error ? "forgot-help forgot-error" : "forgot-help"}
        aria-busy={busy}
        className="mt-6 space-y-5"
      >
        <label className="block font-semibold">
          Email
          <input name="email" type="email" autoComplete="email" required className={field} />
        </label>
        {error && <p id="forgot-error" role="alert" className={errorBox}>{error}</p>}
        <button disabled={busy} aria-label="Send reset link" className={`${btnPrimary} w-full`}>
          <span aria-hidden="true">{busy ? "Sending…" : "Send reset link"}</span>
        </button>
      </form>
      <p role="status" className="sr-only">{busy ? "Sending…" : ""}</p>
      <p className="mt-6"><Link href="/account/sign-in" className={textLink}>Back to sign in</Link></p>
    </Shell>
  );
}

type Phase = "checking" | "ready" | "invalid" | "done";

/**
 * Step 2: the page the emailed link opens. The Supabase client turns the one-time code in the link into a short
 * recovery session; only then can a new password be saved. A link opened on another device or browser cannot
 * be exchanged, so that case asks for a new link.
 */
export function ResetPasswordForm() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("checking");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const settle = (next: Phase) => {
      if (!active) return;
      if (timer) clearTimeout(timer);
      setPhase((current) => (current === "checking" ? next : current));
    };
    let db;
    try {
      db = createClient();
    } catch {
      timer = setTimeout(() => settle("invalid"), 0);
      return () => { active = false; if (timer) clearTimeout(timer); };
    }
    // An expired or already-used link comes back with an error in the address instead of a code.
    if (/(^|[?&#])error(_code|_description)?=/.test(window.location.search + window.location.hash)) {
      timer = setTimeout(() => settle("invalid"), 0);
      return () => { active = false; if (timer) clearTimeout(timer); };
    }
    const { data } = db.auth.onAuthStateChange((_event, session) => { if (session) settle("ready"); });
    db.auth.getSession().then(({ data: current }) => { if (current.session) settle("ready"); }).catch(() => {});
    timer = setTimeout(() => settle("invalid"), 6000);
    return () => { active = false; if (timer) clearTimeout(timer); data.subscription.unsubscribe(); };
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    try {
      const problem = newPasswordError(password, String(form.get("confirm")));
      if (problem) throw new Error(problem);
      const { error: failure } = await createClient().auth.updateUser({ password });
      if (failure) {
        throw new Error(/different from the old|same as the old/i.test(failure.message)
          ? "Choose a password you have not used before."
          : "We could not save the new password. Ask for a new link and try again.");
      }
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (phase === "checking") {
    return <Shell><p role="status" className="text-lg font-bold text-brand-blue">Checking your link…</p></Shell>;
  }
  if (phase === "invalid") {
    return (
      <Shell>
        <div role="alert">
          <h1 className={heading}>This link does not work</h1>
          <p className="mt-3 leading-relaxed">
            It may have expired, been used already, or been opened on a different device or browser than the one that asked
            for it. Ask for a new link and open it on this device.
          </p>
        </div>
        <p className="mt-6"><Link href="/account/forgot-password" className={textLink}>Ask for a new link</Link></p>
      </Shell>
    );
  }
  if (phase === "done") {
    return (
      <Shell>
        <div role="status">
          <h1 className={heading}>Password changed</h1>
          <p className="mt-3 leading-relaxed">You are signed in with your new password.</p>
        </div>
        <button type="button" className={`${btnPrimary} mt-6`} onClick={() => { router.replace("/account"); router.refresh(); }}>
          Go to My orders
        </button>
      </Shell>
    );
  }
  return (
    <Shell>
      <h1 id="reset-heading" className={heading}>Choose a new password</h1>
      <form
        onSubmit={submit}
        aria-labelledby="reset-heading"
        aria-describedby={error ? "reset-error" : undefined}
        aria-busy={busy}
        className="mt-6 space-y-5"
      >
        <label className="block font-semibold">
          New password
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            aria-describedby="reset-rule"
            className={field}
          />
          <span id="reset-rule" className="mt-1 block text-sm font-normal text-muted">At least {MIN_PASSWORD_LENGTH} characters.</span>
        </label>
        <label className="block font-semibold">
          Type it again
          <input name="confirm" type="password" autoComplete="new-password" required className={field} />
        </label>
        {error && <p id="reset-error" role="alert" className={errorBox}>{error}</p>}
        <button disabled={busy} aria-label="Save new password" className={`${btnPrimary} w-full`}>
          <span aria-hidden="true">{busy ? "Saving…" : "Save new password"}</span>
        </button>
      </form>
      <p role="status" className="sr-only">{busy ? "Saving…" : ""}</p>
    </Shell>
  );
}
