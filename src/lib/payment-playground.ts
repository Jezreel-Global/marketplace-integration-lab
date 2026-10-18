import { calculatePlatformFee } from "@/lib/fees";
import type { Currency, Money } from "@/types/marketplace";

export const PLAYGROUND_SCENARIOS = [
  {
    id: "ngn-portrait" as const,
    title: "Portrait session",
    description: "A half-day portrait booking from the fictional NGN catalog.",
    amount: { amountMinor: 7_500_000, currency: "NGN" as const },
  },
  {
    id: "usd-design" as const,
    title: "Design consultation",
    description: "A sample USD-priced marketplace service.",
    amount: { amountMinor: 12_500, currency: "USD" as const },
  },
] satisfies readonly PlaygroundScenario[];

export type PlaygroundScenarioId = "ngn-portrait" | "usd-design";
export type PlaygroundOutcome = "pending" | "success" | "failure";
export type PlaygroundScenario = {
  id: PlaygroundScenarioId;
  title: string;
  description: string;
  amount: Money;
};

export type PlaygroundTransaction = {
  scenario: PlaygroundScenario;
  currency: Currency;
  outcome: PlaygroundOutcome;
  bookingState: "pending_payment" | "paid" | "payment_failed";
  outcomeLabel: string;
  timeline: { label: string; detail: string }[];
  amount: Money;
  platformFee: Money;
  providerShare: Money;
};

/** Builds a browser-demo snapshot; it never creates or persists a booking. */
export function buildPlaygroundTransaction(
  scenarioId: PlaygroundScenarioId,
  outcome: PlaygroundOutcome,
): PlaygroundTransaction {
  const scenario = PLAYGROUND_SCENARIOS.find(({ id }) => id === scenarioId);
  if (!scenario) throw new Error("Unknown playground scenario.");

  const fees = calculatePlatformFee(
    scenario.amount.amountMinor,
    scenario.amount.currency,
  );
  const bookingState =
    outcome === "success"
      ? "paid"
      : outcome === "failure"
        ? "payment_failed"
        : "pending_payment";
  const outcomeLabel =
    outcome === "success"
      ? "Succeeded (simulated)"
      : outcome === "failure"
        ? "Failed (simulated)"
        : "Pending (simulated)";
  const timeline = [
    {
      label: "Sample booking prepared",
      detail: "Illustrative booking snapshot; nothing was saved.",
    },
    {
      label: "Simulated payment attempt",
      detail: outcomeLabel,
    },
    {
      label: `Illustrative booking state: ${bookingState.replaceAll("_", " ")}`,
      detail:
        outcome === "success"
          ? "A successful outcome is shown for learning; no payment was collected."
          : outcome === "failure"
            ? "A failed outcome leaves the sample booking unpaid."
            : "The sample booking remains awaiting a payment outcome.",
    },
  ];

  return {
    scenario,
    currency: scenario.amount.currency,
    outcome,
    bookingState,
    outcomeLabel,
    timeline,
    amount: fees.amount,
    platformFee: fees.platformFee,
    providerShare: fees.providerShare,
  };
}
