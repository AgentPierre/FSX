import assert from "node:assert/strict";
import test from "node:test";
import { loadModule } from "./helpers/load-module.mjs";

const accounts = loadModule(new URL("../lib/customer-accounts.ts", import.meta.url), {});

test("customer accounts stay hidden unless the switch is exactly on", () => {
  const original = process.env.NEXT_PUBLIC_CUSTOMER_ACCOUNTS;
  try {
    for (const value of [undefined, "", "off", "true", "1", "ON", "yes"]) {
      if (value === undefined) delete process.env.NEXT_PUBLIC_CUSTOMER_ACCOUNTS;
      else process.env.NEXT_PUBLIC_CUSTOMER_ACCOUNTS = value;
      assert.equal(accounts.customerAccountsEnabled(), false, `"${value}" must not turn accounts on`);
    }
    process.env.NEXT_PUBLIC_CUSTOMER_ACCOUNTS = "on";
    assert.equal(accounts.customerAccountsEnabled(), true);
  } finally {
    if (original === undefined) delete process.env.NEXT_PUBLIC_CUSTOMER_ACCOUNTS;
    else process.env.NEXT_PUBLIC_CUSTOMER_ACCOUNTS = original;
  }
});

test("sign-up needs a real-looking email and a password of at least 8 characters", () => {
  assert.equal(accounts.credentialsError("maria@example.com", "longenough"), null);
  assert.equal(accounts.credentialsError("maria@example.com", "12345678"), null);
  assert.match(accounts.credentialsError("maria", "longenough"), /valid email/);
  assert.match(accounts.credentialsError("maria@", "longenough"), /valid email/);
  assert.match(accounts.credentialsError("maria @example.com", "longenough"), /valid email/);
  assert.match(accounts.credentialsError("maria@example.com", "1234567"), /at least 8/);
  assert.match(accounts.credentialsError("maria@example.com", ""), /at least 8/);
});

test("every ticket status has a short customer-facing label", () => {
  const label = (ticketStatus, paymentStatus = "paid") => accounts.orderStatusLabel({ paymentStatus, ticketStatus });
  assert.equal(label("received"), "Received");
  assert.equal(label("in_progress"), "Being made");
  assert.equal(label("ready"), "Ready for pickup");
  assert.equal(label("completed"), "Picked up");
  assert.equal(label("cancelled"), "Cancelled");
  assert.equal(label(null), "Received");
  assert.equal(label(null, "expired"), "Not completed");
});

test("pickup times are shown in Houston time whatever the device timezone", () => {
  // 18:00 UTC on 3 Nov 2026 is 12:00 noon Central (standard time).
  assert.equal(accounts.pickupLabel("2026-11-03T18:00:00.000Z"), "Tue, Nov 3, 12:00 PM");
  // Daylight saving: 18:00 UTC on 3 Aug 2026 is 1:00 PM Central.
  assert.equal(accounts.pickupLabel("2026-08-03T18:00:00.000Z"), "Mon, Aug 3, 1:00 PM");
});

test("the item summary lists quantity and name, in order", () => {
  const order = { lines: [{ quantity: 2, name: "Sesame Chicken" }, { quantity: 1, name: "Egg Roll" }] };
  assert.equal(accounts.itemsSummary(order), "2 × Sesame Chicken, 1 × Egg Roll");
  assert.equal(accounts.itemsSummary({ lines: [] }), "");
});

test("the email and password rules can be asked one at a time", () => {
  assert.equal(accounts.emailError("maria@example.com"), null);
  assert.match(accounts.emailError("not an email"), /valid email/);
  assert.equal(accounts.passwordError("12345678"), null);
  assert.match(accounts.passwordError("1234567"), /at least 8/);
});

test("choosing a new password needs 8 characters and two matching entries", () => {
  assert.equal(accounts.newPasswordError("longenough1", "longenough1"), null);
  assert.match(accounts.newPasswordError("short", "short"), /at least 8/);
  assert.match(accounts.newPasswordError("longenough1", "longenough2"), /do not match/);
  assert.match(accounts.newPasswordError("longenough1", ""), /do not match/);
  // The length rule is reported first, so a short password never gets a misleading "do not match" message.
  assert.match(accounts.newPasswordError("short", "different"), /at least 8/);
});

test("checkout pre-fill never overwrites an email the customer already typed", () => {
  assert.equal(accounts.prefillEmail("", "maria@example.com"), "maria@example.com");
  assert.equal(accounts.prefillEmail("   ", "maria@example.com"), "maria@example.com");
  assert.equal(accounts.prefillEmail("other@example.com", "maria@example.com"), "other@example.com");
  assert.equal(accounts.prefillEmail("", ""), "");
});
