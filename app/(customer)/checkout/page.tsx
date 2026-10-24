import { CheckoutForm } from "./checkout-form";

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 text-ink sm:px-6 sm:py-12">
      <p className="text-sm font-bold uppercase tracking-widest text-brand-red">
        Fresh from our kitchen
      </p>
      <h1 className="mt-2 font-heading text-4xl font-black text-brand-blue sm:text-5xl">
        Checkout
      </h1>
      <p className="mt-3 text-muted">
        Pickup only. Review your meal and choose a pickup time.
      </p>
      <CheckoutForm />
    </main>
  );
}
