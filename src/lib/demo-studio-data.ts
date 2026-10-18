import { sumMoney } from "@/lib/money";
import { buildPlaygroundTransaction } from "@/lib/payment-playground";
import { SUPPORTED_CURRENCIES, type Currency } from "@/types/marketplace";
import type { PlaygroundOutcome, PlaygroundScenarioId, PlaygroundTransaction } from "@/lib/payment-playground";

export type DemoPaymentFixture = {
  id: string;
  reference: string;
  customer: string;
  createdAt: string;
  scenarioId: PlaygroundScenarioId;
  defaultOutcome: PlaygroundOutcome;
};

export const DEMO_PAYMENT_FIXTURES: readonly DemoPaymentFixture[] = [
  {
    id: "payment-ngn-001",
    reference: "ML-DEMO-2401",
    customer: "Ada Nwosu",
    createdAt: "2026-10-18T09:30:00.000Z",
    scenarioId: "ngn-portrait",
    defaultOutcome: "success",
  },
  {
    id: "payment-usd-002",
    reference: "ML-DEMO-2402",
    customer: "Sam Rivera",
    createdAt: "2026-10-18T08:10:00.000Z",
    scenarioId: "usd-design",
    defaultOutcome: "pending",
  },
];

/** Return the deterministic activity row associated with a presenter scenario. */
export function getDemoPaymentIdForScenario(
  scenarioId: PlaygroundScenarioId,
): string {
  const fixture = DEMO_PAYMENT_FIXTURES.find(
    ({ scenarioId: fixtureScenarioId }) => fixtureScenarioId === scenarioId,
  );
  if (!fixture) throw new Error("No demo payment fixture exists for this scenario.");
  return fixture.id;
}

export type DemoPaymentRecord = DemoPaymentFixture & {
  transaction: PlaygroundTransaction;
  isConfiguredScenario: boolean;
};

export type DemoCurrencySummary = {
  currency: Currency;
  customerAmount: number;
  platformFee: number;
  providerShare: number;
  succeededShare: number;
  pendingShare: number;
  failedCount: number;
  paymentCount: number;
};

export type DemoStudioSnapshot = {
  payments: DemoPaymentRecord[];
  currencySummaries: DemoCurrencySummary[];
  payoutExamples: DemoPaymentRecord[];
};

/** Builds consistent, deterministic in-memory fixtures for every Studio screen. */
export function buildDemoStudioSnapshot(
  configuredScenario: PlaygroundScenarioId,
  configuredOutcome: PlaygroundOutcome,
): DemoStudioSnapshot {
  const payments = DEMO_PAYMENT_FIXTURES.map((fixture) => {
    const isConfiguredScenario = fixture.scenarioId === configuredScenario;
    return {
      ...fixture,
      isConfiguredScenario,
      transaction: buildPlaygroundTransaction(
        fixture.scenarioId,
        isConfiguredScenario ? configuredOutcome : fixture.defaultOutcome,
      ),
    };
  });

  const currencySummaries = SUPPORTED_CURRENCIES.map((currency) => {
    const matching = payments.filter(
      ({ transaction }) => transaction.currency === currency,
    );
    const succeeded = matching.filter(
      ({ transaction }) => transaction.outcome === "success",
    );
    const pending = matching.filter(
      ({ transaction }) => transaction.outcome === "pending",
    );

    return {
      currency,
      customerAmount: sumMoney(
        matching.map(({ transaction }) => transaction.amount),
        currency,
      ).amountMinor,
      platformFee: sumMoney(
        matching.map(({ transaction }) => transaction.platformFee),
        currency,
      ).amountMinor,
      providerShare: sumMoney(
        matching.map(({ transaction }) => transaction.providerShare),
        currency,
      ).amountMinor,
      succeededShare: sumMoney(
        succeeded.map(({ transaction }) => transaction.providerShare),
        currency,
      ).amountMinor,
      pendingShare: sumMoney(
        pending.map(({ transaction }) => transaction.providerShare),
        currency,
      ).amountMinor,
      failedCount: matching.filter(
        ({ transaction }) => transaction.outcome === "failure",
      ).length,
      paymentCount: matching.length,
    };
  });

  return {
    payments,
    currencySummaries,
    // A preview is shown only for a successful simulated outcome. It never
    // represents a Stripe payout or triggers a transfer.
    payoutExamples: payments.filter(
      ({ transaction }) => transaction.outcome === "success",
    ),
  };
}

export function filterDemoPayments(
  payments: DemoPaymentRecord[],
  currency: Currency | "all",
  outcome: PlaygroundOutcome | "all",
): DemoPaymentRecord[] {
  return payments.filter(({ transaction }) =>
    (currency === "all" || transaction.currency === currency) &&
    (outcome === "all" || transaction.outcome === outcome),
  );
}

/** Keep the active detail row within the currently visible payment results. */
export function getVisibleDemoPaymentId(
  payments: DemoPaymentRecord[],
  selectedId: string,
  currency: Currency | "all",
  outcome: PlaygroundOutcome | "all",
): string {
  const visible = filterDemoPayments(payments, currency, outcome);
  return visible.some(({ id }) => id === selectedId)
    ? selectedId
    : visible[0]?.id ?? "";
}
