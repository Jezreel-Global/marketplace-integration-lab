import assert from "node:assert/strict";
import test from "node:test";
import { bookings, paymentAttempts } from "../src/data/seed";
import {
  groupRecordsBySourceAndCurrency,
  groupPaymentAttempts,
  summarizeBookingsBySourceAndCurrency,
} from "../src/lib/admin-dashboard-summary";
import { formatCurrencyFromMinorUnits } from "../src/lib/format";

test("admin amount formatting uses the recorded currency code", () => {
  assert.match(formatCurrencyFromMinorUnits(12_345, "USD"), /123\.45/);
  assert.match(formatCurrencyFromMinorUnits(12_345, "NGN"), /123\.45/);
  assert.equal(
    formatCurrencyFromMinorUnits(12_345, "EUR"),
    "12345 EUR minor units",
  );
});

test("admin booking totals and statuses remain separated by source and currency", () => {
  const seedBooking = bookings[0];
  const runtimeBooking = {
    ...seedBooking,
    id: "book_runtime_test",
    dataSource: "mock" as const,
    status: "payment_failed" as const,
    amountKobo: 900,
    platformFeeKobo: 90,
    providerShareKobo: 810,
  };
  const summaries = summarizeBookingsBySourceAndCurrency([
    seedBooking,
    runtimeBooking,
  ]);

  assert.equal(summaries.length, 2);
  const seed = summaries.find((group) => group.dataSource === "seed");
  const runtime = summaries.find((group) => group.dataSource === "mock");
  assert.ok(seed);
  assert.ok(runtime);
  assert.equal(seed.currency, "NGN");
  assert.equal(runtime.currency, "NGN");
  assert.equal(seed.bookings.length, 1);
  assert.equal(runtime.bookings.length, 1);
  assert.equal(runtime.statusCounts.payment_failed, 1);
  assert.equal(runtime.statusCounts.paid, 0);
  assert.equal(runtime.grossKobo, 900);
  assert.equal(runtime.platformFeesKobo, 90);
  assert.equal(runtime.providerShareKobo, 810);
});

test("summary grouping does not combine currencies within one data source", () => {
  const groups = groupRecordsBySourceAndCurrency([
    { dataSource: "mock", currency: "NGN", amount: 100 },
    { dataSource: "mock", currency: "USD", amount: 100 },
  ]);

  assert.equal(groups.length, 2);
  assert.deepEqual(
    groups.map((group) => group.currency).sort(),
    ["NGN", "USD"],
  );
  assert.equal(
    groups.every((group) => group.records.length === 1),
    true,
  );
});

test("payment-attempt summary groups seed and simulated runtime rows separately", () => {
  const runtimeAttempt = {
    ...paymentAttempts[0],
    id: "pay_runtime_test",
    dataSource: "mock" as const,
    mode: "simulated" as const,
  };
  const groups = groupPaymentAttempts([paymentAttempts[0], runtimeAttempt]);

  assert.equal(groups.length, 2);
  assert.ok(groups.some((group) => group.dataSource === "seed"));
  assert.ok(groups.some((group) => group.dataSource === "mock"));
});
