import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculatePlatformFee } from "../src/lib/fees";
import { buildPlaygroundTransaction, PLAYGROUND_SCENARIOS } from "../src/lib/payment-playground";
import { assertSameCurrency } from "../src/lib/money";
import {
  buildDemoStudioSnapshot,
  filterDemoPayments,
  getDemoPaymentIdForScenario,
  getVisibleDemoPaymentId,
} from "../src/lib/demo-studio-data";

describe("browser payment playground", () => {
  it("provides predictable, explicitly currency-tagged NGN and USD samples", () => {
    assert.deepEqual(
      PLAYGROUND_SCENARIOS.map(({ amount }) => [amount.amountMinor, amount.currency]),
      [[7_500_000, "NGN"], [12_500, "USD"]],
    );
  });

  it("uses the shared fee calculation and conserves each sample amount", () => {
    for (const scenario of PLAYGROUND_SCENARIOS) {
      const transaction = buildPlaygroundTransaction(scenario.id, "pending");
      const expected = calculatePlatformFee(
        scenario.amount.amountMinor,
        scenario.amount.currency,
      );
      assert.deepEqual(transaction.amount, expected.amount);
      assert.deepEqual(transaction.platformFee, expected.platformFee);
      assert.deepEqual(transaction.providerShare, expected.providerShare);
      assert.equal(
        transaction.platformFee.amountMinor + transaction.providerShare.amountMinor,
        transaction.amount.amountMinor,
      );
      assert.equal(
        assertSameCurrency(transaction.amount, transaction.platformFee, transaction.providerShare),
        scenario.amount.currency,
      );
    }
  });

  it("labels pending, success, and failure as browser simulations with matching illustrative states", () => {
    const cases = [
      { outcome: "pending" as const, bookingState: "pending_payment", attempt: /Pending \(simulated\)/ },
      { outcome: "success" as const, bookingState: "paid", attempt: /Succeeded \(simulated\)/ },
      { outcome: "failure" as const, bookingState: "payment_failed", attempt: /Failed \(simulated\)/ },
    ];

    for (const testCase of cases) {
      const transaction = buildPlaygroundTransaction("usd-design", testCase.outcome);
      assert.equal(transaction.bookingState, testCase.bookingState);
      assert.match(transaction.outcomeLabel, testCase.attempt);
      assert.match(transaction.timeline[1].detail, testCase.attempt);
      assert.match(transaction.timeline[0].detail, /nothing was saved/);
    }
  });
});


describe("shared Demo Studio fixture ledger", () => {
  it("selects the matching payment detail when the presenter changes scenario", () => {
    const scenarioId = "usd-design";
    const selectedPaymentId = getDemoPaymentIdForScenario(scenarioId);
    const snapshot = buildDemoStudioSnapshot(scenarioId, "failure");
    const selected = snapshot.payments.find(({ id }) => id === selectedPaymentId);

    assert.ok(selected);
    assert.equal(selected.scenarioId, scenarioId);
    assert.equal(selected.transaction.scenario.id, scenarioId);
    assert.deepEqual(selected.transaction.amount, { amountMinor: 12_500, currency: "USD" });
    assert.deepEqual(selected.transaction.platformFee, { amountMinor: 1_250, currency: "USD" });
    assert.deepEqual(selected.transaction.providerShare, { amountMinor: 11_250, currency: "USD" });
    assert.equal(selected.transaction.outcome, "failure");
    assert.equal(selected.transaction.bookingState, "payment_failed");
  });

  it("keeps the dashboard summaries separated by currency and derived from the same rows", () => {
    const snapshot = buildDemoStudioSnapshot("ngn-portrait", "success");
    const ngn = snapshot.currencySummaries.find(({ currency }) => currency === "NGN");
    const usd = snapshot.currencySummaries.find(({ currency }) => currency === "USD");

    assert.deepEqual(
      [ngn?.customerAmount, ngn?.platformFee, ngn?.providerShare],
      [7_500_000, 750_000, 6_750_000],
    );
    assert.deepEqual(
      [usd?.customerAmount, usd?.platformFee, usd?.providerShare],
      [12_500, 1_250, 11_250],
    );
    assert.equal(ngn?.succeededShare, 6_750_000);
    assert.equal(usd?.pendingShare, 11_250);
    assert.deepEqual(
      snapshot.payments.map(({ transaction }) => transaction.currency),
      ["NGN", "USD"],
    );
  });

  it("reflects the configured outcome across activity, summaries, and payout previews in memory", () => {
    const pending = buildDemoStudioSnapshot("ngn-portrait", "pending");
    const pendingNgn = pending.currencySummaries.find(({ currency }) => currency === "NGN");
    assert.equal(pending.payments[0].transaction.outcome, "pending");
    assert.equal(pendingNgn?.pendingShare, 6_750_000);
    assert.equal(pendingNgn?.succeededShare, 0);
    assert.equal(pending.payoutExamples.some(({ transaction }) => transaction.currency === "NGN"), false);

    const failed = buildDemoStudioSnapshot("ngn-portrait", "failure");
    const failedNgn = failed.currencySummaries.find(({ currency }) => currency === "NGN");
    assert.equal(failed.payments[0].transaction.outcome, "failure");
    assert.equal(failedNgn?.failedCount, 1);
    assert.equal(failedNgn?.succeededShare, 0);
    assert.equal(failed.payoutExamples.some(({ transaction }) => transaction.currency === "NGN"), false);

    const succeeded = buildDemoStudioSnapshot("usd-design", "success");
    assert.equal(succeeded.payments[1].transaction.outcome, "success");
    assert.equal(succeeded.currencySummaries.find(({ currency }) => currency === "USD")?.succeededShare, 11_250);
    assert.equal(succeeded.payoutExamples.some(({ transaction }) => transaction.currency === "USD"), true);
  });

  it("filters sample rows by currency and simulated status", () => {
    const snapshot = buildDemoStudioSnapshot("ngn-portrait", "failure");
    assert.deepEqual(
      filterDemoPayments(snapshot.payments, "NGN", "failure").map(({ id }) => id),
      ["payment-ngn-001"],
    );
    assert.deepEqual(
      filterDemoPayments(snapshot.payments, "USD", "success"),
      [],
    );
    assert.equal(filterDemoPayments(snapshot.payments, "all", "all").length, 2);
  });

  it("keeps the selected detail row visible when currency or outcome filters change", () => {
    const snapshot = buildDemoStudioSnapshot("usd-design", "failure");
    assert.equal(
      getVisibleDemoPaymentId(snapshot.payments, "payment-ngn-001", "USD", "all"),
      "payment-usd-002",
    );
    assert.equal(
      getVisibleDemoPaymentId(snapshot.payments, "payment-usd-002", "USD", "success"),
      "",
    );
    assert.equal(
      getVisibleDemoPaymentId(snapshot.payments, "payment-usd-002", "all", "all"),
      "payment-usd-002",
    );
  });
});
