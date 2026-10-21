import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { loadModule } from "./helpers/load-module.mjs";

const require = createRequire(import.meta.url);
const hours = loadModule(new URL("../lib/hours.ts", import.meta.url), {});
const rules = loadModule(new URL("../lib/menu-rules.ts", import.meta.url), {});
const cart = loadModule(new URL("../lib/cart.ts", import.meta.url), {
  "./menu-rules": rules,
});
const validation = loadModule(
  new URL("../lib/validation.ts", import.meta.url),
  {
    zod: require("zod"),
    "./errors": {},
  },
);
const checkout = loadModule(
  new URL("../lib/checkout.ts", import.meta.url),
  {
    "./hours": hours,
    "./cart": cart,
    "./validation": validation,
  },
  { URL },
);
const businessHours = Array.from({ length: 7 }, (_, dayOfWeek) => ({
  dayOfWeek,
  openMinutes: dayOfWeek ? 660 : null,
  closeMinutes: dayOfWeek ? 1260 : null,
}));
const now = new Date("2026-10-21T17:00:00Z");
const customer = { name: " Ana ", email: "ana@example.com" };
const line = {
  sizeId: "regular",
  quantity: 1,
  spicy: false,
  instructions: "No onions",
  components: [],
};
const menu = [
  {
    items: [
      {
        code: "C1",
        name: "Plate",
        isActive: true,
        isAvailable: true,
        isCatering: false,
        sizes: [{ id: "regular", priceCents: 1299 }],
      },
      {
        code: "T1",
        name: "Tray",
        isActive: true,
        isAvailable: true,
        isCatering: true,
        sizes: [{ id: "tray", priceCents: 3999 }],
      },
    ],
  },
];
const settings = {
  leadRegularMinutes: 15,
  leadCateringMinutes: 40,
  taxRateBps: 825,
};

test("customer schema matches required names, emails and optional phone limits", () => {
  const schema = validation.createOrderSchema.shape.customer;
  assert.equal(schema.parse(customer).name, "Ana");
  for (const input of [
    { ...customer, name: " " },
    { ...customer, name: "a".repeat(101) },
    { ...customer, email: "invalid" },
    { ...customer, email: `${"a".repeat(250)}@x.com` },
    { ...customer, phone: "1".repeat(31) },
  ])
    assert.equal(schema.safeParse(input).success, false);
  assert.equal(
    schema.safeParse({
      ...customer,
      name: "a".repeat(100),
      phone: "1".repeat(30),
    }).success,
    true,
  );
  assert.equal(schema.safeParse({ ...customer, phone: "" }).success, true);
});

test("Houston conversion follows winter and summer offsets, independent of browser timezone", () => {
  assert.equal(
    checkout.houstonInstant("2026-01-21T12:00").toISOString(),
    "2026-01-21T18:00:00.000Z",
  );
  assert.equal(
    checkout.houstonInstant("2026-07-21T12:00").toISOString(),
    "2026-07-21T17:00:00.000Z",
  );
  assert.equal(checkout.houstonInstant("2026-03-08T02:30"), null);
  assert.equal(checkout.houstonInstant("2026-11-01T01:30"), null);
  assert.equal(
    checkout.houstonInstant("2026-03-08T03:00").toISOString(),
    "2026-03-08T08:00:00.000Z",
  );
  assert.equal(
    checkout.houstonInstant("2026-11-01T02:00").toISOString(),
    "2026-11-01T08:00:00.000Z",
  );
  assert.equal(checkout.houstonInstant("2026-02-30T12:00"), null);
  assert.equal(checkout.houstonInstant("bad"), null);
});

test("extreme and invalid pickup dates never throw and remain recoverable", () => {
  for (const value of [
    "0001-01-01T12:00",
    "9999-12-31T12:00",
    "0000-01-01T00:00",
    "2026-02-30T12:00",
    "2026-13-01T12:00",
    "2026-10-21T99:00",
    "",
    "not a date",
  ]) {
    let result;
    assert.doesNotThrow(() => {
      result = checkout.houstonInstant(value);
    });
    assert.ok(result === null || Number.isFinite(result.getTime()));
  }
  assert.equal(checkout.houstonInstant("2026-02-30T12:00"), null);
  assert.match(
    checkout.pickupError(new Date(NaN), now, 15, businessHours),
    /valid pickup/,
  );
  // A distant valid date remains selectable: this is not a booking horizon.
  assert.equal(
    checkout.houstonInstant("9999-12-31T12:00")?.toISOString(),
    "9999-12-31T18:00:00.000Z",
  );
});

test("customer normalization preserves full trimmed names and phone numbers at their limits", () => {
  const result = checkout.validateCustomer({
    name: `  ${"a".repeat(100)}  `,
    email: " ana@example.com ",
    phone: `  ${"1".repeat(30)}  `,
  });
  assert.equal(result.success, true);
  assert.equal(result.data.name, "a".repeat(100));
  assert.equal(result.data.phone, "1".repeat(30));
  assert.equal(result.data.email, "ana@example.com");
  for (const input of [
    { ...customer, name: ` ${"a".repeat(101)} ` },
    { ...customer, phone: ` ${"1".repeat(31)} ` },
    { ...customer, name: "  " },
    { ...customer, email: "bad" },
  ]) {
    assert.equal(checkout.validateCustomer(input).success, false);
  }
  assert.equal(checkout.validateCustomer(customer).success, true);
});

function memoryStorage(initial = null) {
  let value = initial;
  return {
    getItem: () => value,
    setItem: (_key, next) => {
      value = next;
    },
  };
}

test("cart persistence replaces stale data with the exact current whitelisted snapshot", () => {
  const storage = memoryStorage("old cart");
  const current = [{ id: "current", ...line, priceCents: 1 }];
  cart.persistCart(current, storage);
  assert.equal(
    storage.getItem(cart.CART_STORAGE_KEY),
    cart.serializeCart(current),
  );
  assert.equal(JSON.parse(storage.getItem()).lines[0].priceCents, undefined);
  const changed = [{ ...current[0], quantity: 2, instructions: "New note" }];
  cart.persistCart(changed, storage);
  assert.deepEqual(
    JSON.parse(JSON.stringify(cart.restoreCart(storage.getItem(), menu).lines)),
    changed.map((entry) => ({ id: entry.id, ...line, quantity: 2, instructions: "New note" })),
  );
});

test("storage write/read failures and stale readbacks are rejected without changing the cart", () => {
  const current = [{ id: "current", ...line }];
  const original = JSON.stringify(current);
  for (const storage of [
    {
      setItem() {
        throw new Error("quota");
      },
      getItem() {
        return null;
      },
    },
    {
      setItem() {},
      getItem() {
        throw new Error("blocked");
      },
    },
    {
      setItem() {},
      getItem() {
        return "old cart";
      },
    },
  ])
    assert.throws(() => cart.persistCart(current, storage));
  assert.equal(JSON.stringify(current), original);
});

test("submission blocks duplicate attempts and cancellation can restore the saved cart", async () => {
  const submission = checkout.createCheckoutSubmission();
  const current = [{ id: "current", ...line }];
  const storage = memoryStorage();
  const persist = () => cart.persistCart(current, storage);
  const payload = checkout.buildCheckoutPayload(customer, now, [line]);
  let complete;
  let attempts = 0;
  const destinations = [];
  const send = () => {
    attempts++;
    return new Promise((resolve) => {
      complete = resolve;
    });
  };
  const first = submission.submit(
    payload,
    persist,
    (url) => destinations.push(url),
    send,
  );
  assert.equal(submission.isActive, true);
  assert.equal(
    await submission.submit(
      payload,
      persist,
      () => assert.fail("duplicate redirect"),
      send,
    ),
    false,
  );
  current[0] = { ...current[0], quantity: 2 };
  complete({
    ok: true,
    json: async () => ({ checkoutUrl: "https://checkout.stripe.com/test" }),
  });
  assert.equal(await first, true);
  assert.equal(attempts, 1);
  assert.equal(destinations.length, 1);
  assert.equal(
    await submission.submit(
      payload,
      persist,
      () => assert.fail("duplicate redirect"),
      send,
    ),
    false,
  );
  // Simulate loading /cart after cancellation using the same restoration path as the provider.
  assert.deepEqual(
    JSON.parse(JSON.stringify(cart.restoreCart(storage.getItem(), menu).lines)),
    current,
  );
  submission.reset();
  assert.equal(submission.isActive, false);
});

test("failed persistence prevents order creation, and a late failure reuses the created session", async () => {
  const submission = checkout.createCheckoutSubmission();
  const payload = checkout.buildCheckoutPayload(customer, now, [line]);
  let attempts = 0;
  let redirects = 0;
  const navigate = () => {
    redirects++;
  };
  const send = async () => {
    attempts++;
    return {
      ok: true,
      json: async () => ({ checkoutUrl: "https://checkout.stripe.com/test" }),
    };
  };
  await assert.rejects(
    submission.submit(
      payload,
      () => {
        throw new Error("storage blocked");
      },
      navigate,
      send,
    ),
    /storage blocked/,
  );
  assert.equal(attempts, 0);
  let checks = 0;
  await assert.rejects(
    submission.submit(
      payload,
      () => {
        if (++checks === 2) throw new Error("storage changed");
      },
      navigate,
      send,
    ),
    /storage changed/,
  );
  assert.equal(attempts, 1);
  assert.equal(redirects, 0);
  await submission.submit(payload, () => {}, navigate, send);
  assert.equal(attempts, 1); // Persistence retry must not create another order.
  assert.equal(redirects, 1);
});

test("API failure leaves the saved cart intact and does not retry order creation", async () => {
  const submission = checkout.createCheckoutSubmission();
  const current = [{ id: "current", ...line }];
  const storage = memoryStorage();
  let attempts = 0;
  await assert.rejects(
    submission.submit(
      checkout.buildCheckoutPayload(customer, now, [line]),
      () => cart.persistCart(current, storage),
      () => assert.fail("redirect on failure"),
      async () => {
        attempts++;
        throw new Error("offline");
      },
    ),
    /No automatic retry/,
  );
  assert.equal(attempts, 1);
  assert.equal(submission.isActive, false);
  assert.deepEqual(
    JSON.parse(JSON.stringify(cart.restoreCart(storage.getItem(), menu).lines)),
    current,
  );
});

test("configured lead times cover regular, catering and mixed carts", () => {
  assert.equal(checkout.checkoutLead([line], menu, settings), 15);
  assert.equal(
    checkout.checkoutLead([{ ...line, sizeId: "tray" }], menu, settings),
    40,
  );
  assert.equal(
    checkout.checkoutLead([line, { ...line, sizeId: "tray" }], menu, settings),
    40,
  );
  assert.equal(
    checkout.checkoutLead([line], menu, {
      ...settings,
      leadRegularMinutes: 22,
    }),
    22,
  );
  assert.equal(
    checkout.earliestInput(new Date("2026-10-21T17:00:01Z"), 15),
    "2026-10-21T12:16",
  );
});

test("pickup enforces exact lead, stored opening/closing boundaries and ordering hours", () => {
  const check = (value, current = now) =>
    checkout.pickupError(
      checkout.houstonInstant(value),
      current,
      15,
      businessHours,
    );
  assert.equal(check("2026-10-21T12:15"), null);
  assert.match(check("2026-10-21T12:14"), /at least/);
  assert.match(
    check("2026-10-21T12:15", new Date(now.getTime() + 1)),
    /at least/,
  );
  assert.equal(check("2026-10-22T11:00"), null);
  assert.match(check("2026-10-22T10:59"), /business hours/);
  assert.equal(check("2026-10-21T21:00"), null);
  assert.match(check("2026-10-21T21:01"), /business hours/);
  assert.match(check("2026-10-25T12:00"), /business hours/);
  assert.match(
    check("2026-10-21T12:15", new Date("2026-10-21T15:59:00Z")),
    /closed/,
  );
  assert.equal(check("2027-01-21T12:00"), null); // No advance-booking cap.
  const changedHours = businessHours.map((day) => ({
    ...day,
    openMinutes: 780,
  }));
  assert.match(
    checkout.pickupError(new Date("2026-10-21T20:00Z"), now, 15, changedHours),
    /closed/,
  );
  assert.match(checkout.pickupError(null, now, 15, []), /closed/);
});

test("payload is whitelisted and preserves combo, spicy and instructions without prices or IDs", () => {
  const prepared = cart.checkoutLines(
    [{ id: "cart-id", ...line, priceCents: 1 }],
    menu,
  );
  const payload = checkout.buildCheckoutPayload(
    { ...customer, secret: "ignored" },
    now,
    prepared,
  );
  assert.deepEqual(JSON.parse(JSON.stringify(payload)), {
    customer: { name: "Ana", email: customer.email },
    pickupTime: now.toISOString(),
    lines: [line],
  });
  const combo = { ...line, spicy: true, components: ["G2", "G5"] };
  assert.deepEqual(
    JSON.parse(
      JSON.stringify(
        checkout.buildCheckoutPayload(customer, now, [combo]).lines,
      ),
    ),
    [combo],
  );
  assert.throws(() => cart.checkoutLines([], menu), /1–30/);
  assert.throws(
    () => cart.checkoutLines([{ ...line, sizeId: "missing" }], menu),
    /no longer available/,
  );
  assert.throws(
    () => cart.checkoutLines([{ ...line, quantity: 51 }], menu),
    /Quantity/,
  );
  assert.throws(() => checkout.buildCheckoutPayload(customer, now, []));
});

test("API errors give safe recovery copy even for malformed responses", () => {
  for (const body of [
    null,
    {},
    { error: { code: "stripe_error", message: "secret" } },
  ]) {
    assert.match(checkout.checkoutFailure(body), /cart is preserved/);
    assert.doesNotMatch(checkout.checkoutFailure(body), /secret/);
  }
  assert.match(
    checkout.checkoutFailure({ error: { code: "pickup_too_early" } }),
    /later time/,
  );
  assert.match(
    checkout.checkoutFailure({ error: { code: "checkout_conflict" } }),
    /Refresh/,
  );
  assert.match(
    checkout.checkoutFailure({ error: { code: "item_unavailable" } }),
    /availability/,
  );
});

test("checkout sends one POST, returns the hosted URL, and never retries failed requests", async () => {
  const payload = checkout.buildCheckoutPayload(customer, now, [line]);
  let attempts = 0;
  const send = async (url, options) => {
    attempts++;
    assert.equal(url, "/api/orders");
    assert.equal(options.method, "POST");
    assert.deepEqual(
      JSON.parse(options.body),
      JSON.parse(JSON.stringify(payload)),
    );
    return {
      ok: true,
      json: async () => ({
        checkoutUrl: "https://checkout.stripe.com/c/pay/test",
      }),
    };
  };
  assert.equal(
    await checkout.requestCheckout(payload, send),
    "https://checkout.stripe.com/c/pay/test",
  );
  assert.equal(attempts, 1);
  attempts = 0;
  await assert.rejects(
    checkout.requestCheckout(payload, async () => {
      attempts++;
      throw new Error("offline");
    }),
    /No automatic retry/,
  );
  assert.equal(attempts, 1);
  await assert.rejects(
    checkout.requestCheckout(payload, async () => ({
      ok: false,
      json: async () => ({ error: { code: "pickup_too_early" } }),
    })),
    /later time/,
  );
  for (const checkoutUrl of [
    undefined,
    "http://checkout.stripe.com/test",
    "https://example.com/test",
    "javascript:alert(1)",
  ]) {
    await assert.rejects(
      checkout.requestCheckout(payload, async () => ({
        ok: true,
        json: async () => ({ checkoutUrl }),
      })),
      /invalid payment link/,
    );
  }
  await assert.rejects(
    checkout.requestCheckout(payload, async () => ({
      ok: false,
      json: async () => {
        throw new Error();
      },
    })),
    /cart is preserved/,
  );
});
