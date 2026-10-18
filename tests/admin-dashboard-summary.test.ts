import assert from "node:assert/strict";
import test from "node:test";
import { bookings, paymentAttempts } from "../src/data/seed";
import {
  groupRecordsBySourceAndCurrency,
  groupPaymentAttempts,
  summarizeBookingsBySourceAndCurrency,
} from "../src/lib/admin-dashboard-summary";
import { formatMoney } from "../src/lib/format";

test("admin amount formatting uses the recorded currency code", () => {
  assert.match(formatMoney({ amountMinor: 12_345, currency: "USD" }), /\$.*123\.45/);
  assert.match(formatMoney({ amountMinor: 12_345, currency: "NGN" }), /₦.*123\.45/);
  assert.match(
    formatMoney({ amountMinor: Number.MAX_SAFE_INTEGER, currency: "USD" }),
    /90,071,992,547,409\.91/,
  );
  assert.throws(() => formatMoney({ amountMinor: 12_345, currency: "EUR" as never }));
});

test("admin booking totals and statuses remain separated by source and currency", () => {
  const seedBooking = bookings[0];
  const runtimeBooking = {
    ...seedBooking,
    id: "book_runtime_test",
    dataSource: "mock" as const,
    status: "payment_failed" as const,
    amount: { amountMinor: 900, currency: "NGN" as const },
    platformFee: { amountMinor: 90, currency: "NGN" as const },
    providerShare: { amountMinor: 810, currency: "NGN" as const },
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
  assert.deepEqual(runtime.gross, { amountMinor: 900, currency: "NGN" });
  assert.deepEqual(runtime.platformFees, { amountMinor: 90, currency: "NGN" });
  assert.deepEqual(runtime.providerShare, { amountMinor: 810, currency: "NGN" });
});

test("admin booking fee math aggregates snapshots across states, not collected revenue", () => {
  const stateRows = [
    { ...bookings[0], id: "pending", status: "pending_payment" as const },
    { ...bookings[0], id: "failed", status: "payment_failed" as const },
    { ...bookings[0], id: "cancelled", status: "cancelled" as const },
    { ...bookings[0], id: "paid-label", status: "paid" as const },
  ].map((booking) => ({
    ...booking,
    dataSource: "mock" as const,
    amount: { amountMinor: 100, currency: "NGN" as const },
    platformFee: { amountMinor: 10, currency: "NGN" as const },
    providerShare: { amountMinor: 90, currency: "NGN" as const },
  }));

  const [summary] = summarizeBookingsBySourceAndCurrency(stateRows);

  assert.ok(summary);
  assert.equal(summary.bookings.length, 4);
  assert.equal(summary.statusCounts.pending_payment, 1);
  assert.equal(summary.statusCounts.payment_failed, 1);
  assert.equal(summary.statusCounts.cancelled, 1);
  assert.equal(summary.statusCounts.paid, 1);
  // The current admin “fee math” is a sum of booking snapshots across every
  // state. It must not be read as collected revenue or actual payouts.
  assert.deepEqual(summary.gross, { amountMinor: 400, currency: "NGN" });
  assert.deepEqual(summary.platformFees, { amountMinor: 40, currency: "NGN" });
  assert.deepEqual(summary.providerShare, { amountMinor: 360, currency: "NGN" });
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

test("booking summaries preserve real record currencies and reject inconsistent splits", () => {
  const ngn = bookings[0];
  const usd = {
    ...ngn,
    id: "book_usd_test",
    dataSource: "mock" as const,
    amount: { amountMinor: 1_000, currency: "USD" as const },
    platformFee: { amountMinor: 100, currency: "USD" as const },
    providerShare: { amountMinor: 900, currency: "USD" as const },
  };
  const summaries = summarizeBookingsBySourceAndCurrency([ngn, usd]);
  assert.equal(summaries.length, 2);
  assert.ok(summaries.some((summary) => summary.currency === "NGN"));
  assert.ok(summaries.some((summary) => summary.currency === "USD"));

  assert.throws(() =>
    summarizeBookingsBySourceAndCurrency([
      { ...usd, providerShare: { amountMinor: 899, currency: "USD" } },
    ]),
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
