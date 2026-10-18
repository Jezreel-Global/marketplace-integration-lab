"use client";

import { useState } from "react";
import {
  buildPlaygroundTransaction,
  PLAYGROUND_SCENARIOS,
  type PlaygroundOutcome,
  type PlaygroundScenarioId,
} from "@/lib/payment-playground";
import { formatMoney } from "@/lib/format";
import { ConnectLearningResources } from "@/components/connect-learning-resources";

const outcomes: { id: PlaygroundOutcome; label: string }[] = [
  { id: "pending", label: "Pending" },
  { id: "success", label: "Success" },
  { id: "failure", label: "Failure" },
];

const outcomeStyles: Record<PlaygroundOutcome, { pill: string; marker: string }> = {
  pending: {
    pill: "border-amber-200 bg-amber-50 text-amber-900",
    marker: "bg-amber-500 text-white",
  },
  success: {
    pill: "border-emerald-200 bg-emerald-50 text-emerald-900",
    marker: "bg-emerald-600 text-white",
  },
  failure: {
    pill: "border-rose-200 bg-rose-50 text-rose-900",
    marker: "bg-rose-600 text-white",
  },
};

export type PaymentPlaygroundProps = {
  embedded?: boolean;
  scenarioId?: PlaygroundScenarioId;
  outcome?: PlaygroundOutcome;
  onScenarioChange?: (scenarioId: PlaygroundScenarioId) => void;
  onOutcomeChange?: (outcome: PlaygroundOutcome) => void;
};

export function PaymentPlayground({
  embedded = false,
  scenarioId: controlledScenarioId,
  outcome: controlledOutcome,
  onScenarioChange,
  onOutcomeChange,
}: PaymentPlaygroundProps = {}) {
  const [localScenarioId, setLocalScenarioId] = useState<PlaygroundScenarioId>("ngn-portrait");
  const [localOutcome, setLocalOutcome] = useState<PlaygroundOutcome>("pending");
  const scenarioId = controlledScenarioId ?? localScenarioId;
  const outcome = controlledOutcome ?? localOutcome;
  const transaction = buildPlaygroundTransaction(scenarioId, outcome);
  const changeScenario = (nextScenarioId: PlaygroundScenarioId) => {
    setLocalScenarioId(nextScenarioId);
    onScenarioChange?.(nextScenarioId);
  };
  const changeOutcome = (nextOutcome: PlaygroundOutcome) => {
    setLocalOutcome(nextOutcome);
    onOutcomeChange?.(nextOutcome);
  };
  const statusStyle = outcomeStyles[outcome];

  return (
    <div className={embedded ? "w-full" : "mx-auto max-w-7xl px-4 pb-14 pt-5 sm:px-6 sm:pb-16 sm:pt-8 lg:px-8"}>
      {!embedded && <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-line)] pb-4 text-sm">
        <p className="font-medium text-[var(--color-ink-muted)]">
          Marketplace Integration Lab <span className="px-1 text-[var(--color-line)]">/</span>{" "}
          <span className="text-[var(--color-ink)]">Demo Studio</span>
        </p>
        <nav aria-label="Demo Studio" className="flex items-center gap-1">
          <a
            className="focus-ring rounded-md px-3 py-2 font-medium text-[var(--color-ink-muted)] transition-colors hover:bg-white hover:text-[var(--color-ink)]"
            href="#simulator"
          >
            Simulator
          </a>
          <a
            className="focus-ring rounded-md px-3 py-2 font-medium text-[var(--color-ink-muted)] transition-colors hover:bg-white hover:text-[var(--color-ink)]"
            href="#learning-resources"
          >
            Learning paths
          </a>
        </nav>
      </div>}

      {!embedded && <div className="mb-7 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 sm:items-center sm:px-5">
        <span aria-hidden="true" className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-amber-500 text-sm font-bold sm:mt-0">
          i
        </span>
        <div>
          <p className="text-sm font-extrabold uppercase tracking-wide sm:text-base">
            Simulation only · no real money moves
          </p>
          <p className="mt-0.5 text-sm text-amber-900/80">
            This browser-only learning tool makes no Stripe or Paystack calls, creates no booking, and saves no data.
          </p>
        </div>
      </div>}

      {!embedded && <header id="simulator" className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-accent)]">
            Marketplace payment lab
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-[var(--color-ink)] sm:text-4xl lg:text-5xl">
            See how the value splits
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--color-ink-muted)] sm:text-lg">
            Choose a sample service and payment outcome. The preview updates to show the illustrative 10% platform fee and provider share.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--color-line)] bg-white px-3 py-2 text-sm font-semibold text-[var(--color-ink-muted)] shadow-sm">
          <span className="h-2 w-2 rounded-full bg-[var(--color-accent)]" aria-hidden="true" />
          Browser-only demo
        </span>
      </header>}

      <div className={`grid items-start gap-5 xl:gap-6 ${embedded ? "lg:grid-cols-[280px_minmax(0,1fr)]" : "lg:grid-cols-[300px_minmax(0,1fr)]"}`}>
        <aside className="rounded-xl border border-[var(--color-line)] bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-start justify-between gap-3 border-b border-[var(--color-line)] pb-4">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">Configure a scenario</h2>
              <p className="mt-1 text-sm text-[var(--color-ink-muted)]">Make a choice to update the preview.</p>
            </div>
            <span className="rounded-full bg-[var(--color-brand-soft)] px-2.5 py-1 text-xs font-bold text-[var(--color-brand)]">
              Ready
            </span>
          </div>

          <fieldset className="mt-4">
            <legend className="mb-2 text-sm font-bold">1 · Sample service</legend>
            <div className="space-y-2">
              {PLAYGROUND_SCENARIOS.map((scenario) => {
                const selected = scenario.id === scenarioId;
                return (
                  <button
                    key={scenario.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => changeScenario(scenario.id)}
                    className={`focus-ring w-full rounded-lg border px-3 py-3 text-left transition-colors ${
                      selected
                        ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)]/70"
                        : "border-[var(--color-line)] bg-white hover:border-[var(--color-brand)] hover:bg-[var(--color-canvas)]"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-semibold">{scenario.title}</span>
                      <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-ink-muted)]">
                        {scenario.amount.currency}
                      </span>
                    </span>
                    <span className="mt-1 block text-sm text-[var(--color-ink-muted)]">
                      {scenario.description}
                    </span>
                    <span className="mt-3 block font-[family-name:var(--font-display)] text-xl font-bold tabular-nums">
                      {formatMoney(scenario.amount)}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="mt-5 border-t border-[var(--color-line)] pt-4">
            <legend className="mb-2 text-sm font-bold">2 · Simulated outcome</legend>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-[var(--color-canvas)] p-1">
              {outcomes.map((item) => {
                const selected = item.id === outcome;
                const selectedStyle =
                  item.id === "pending"
                    ? "bg-amber-100 text-amber-950 ring-1 ring-amber-300"
                    : item.id === "success"
                      ? "bg-emerald-100 text-emerald-950 ring-1 ring-emerald-300"
                      : "bg-rose-100 text-rose-950 ring-1 ring-rose-300";
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => changeOutcome(item.id)}
                    className={`focus-ring min-h-11 rounded-md px-2 text-sm font-bold transition-colors ${
                      selected
                        ? selectedStyle
                        : "text-[var(--color-ink-muted)] hover:bg-white hover:text-[var(--color-ink)]"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs leading-5 text-[var(--color-ink-muted)]">
              Selecting an outcome changes only this on-screen illustration.
            </p>
          </fieldset>

          <div className="mt-5 rounded-lg border border-[var(--color-line)] bg-[var(--color-canvas)]/70 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-ink-muted)]">Current scenario</p>
            <p className="mt-1 font-semibold">{transaction.scenario.title}</p>
            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
              {transaction.currency} · sample amount {formatMoney(transaction.amount)}
            </p>
          </div>
        </aside>

        <section
          aria-label="Simulated transaction preview"
          className="min-w-0 space-y-5"
        >
          <p className="sr-only" role="status" aria-atomic="true">
            Preview updated: {transaction.scenario.title}, {transaction.currency}, customer amount {formatMoney(transaction.amount)}, platform fee {formatMoney(transaction.platformFee)}, provider share {formatMoney(transaction.providerShare)}, outcome {transaction.outcomeLabel}, illustrative booking state {transaction.bookingState.replaceAll("_", " ")}.
          </p>
          <section className="overflow-hidden rounded-xl border border-[var(--color-line)] bg-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--color-line)] px-4 py-4 sm:px-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--color-ink-muted)]">Transaction preview</p>
                <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold sm:text-2xl">
                  {transaction.scenario.title}
                </h2>
                <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
                  Illustrative marketplace split · {transaction.currency}
                </p>
              </div>
              <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-bold ${statusStyle.pill}`}>
                <span className={`h-2 w-2 rounded-full ${statusStyle.marker}`} aria-hidden="true" />
                {transaction.outcomeLabel}
              </span>
            </div>

            <div className="px-4 py-5 sm:px-6 sm:py-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">Value split</h3>
                <span className="text-xs font-medium text-[var(--color-ink-muted)]">All amounts remain in {transaction.currency}</span>
              </div>
              <dl className="grid overflow-hidden rounded-lg border border-[var(--color-line)] sm:grid-cols-3">
                <div className="border-b border-[var(--color-line)] p-4 sm:border-b-0 sm:border-r sm:p-5">
                  <dt className="text-sm font-medium text-[var(--color-ink-muted)]">Customer amount</dt>
                  <dd className="mt-2 font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-tight tabular-nums sm:text-3xl">
                    {formatMoney(transaction.amount)}
                  </dd>
                  <p className="mt-2 text-xs text-[var(--color-ink-muted)]">Sample service price</p>
                </div>
                <div className="border-b border-[var(--color-line)] bg-[var(--color-canvas)]/65 p-4 sm:border-b-0 sm:border-r sm:p-5">
                  <dt className="text-sm font-medium text-[var(--color-ink-muted)]">Illustrative platform fee</dt>
                  <dd className="mt-2 font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-tight tabular-nums sm:text-3xl">
                    {formatMoney(transaction.platformFee)}
                  </dd>
                  <p className="mt-2 text-xs text-[var(--color-ink-muted)]">10% · example calculation</p>
                </div>
                <div className="p-4 sm:p-5">
                  <dt className="text-sm font-medium text-[var(--color-ink-muted)]">Illustrative provider share</dt>
                  <dd className="mt-2 font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-tight tabular-nums text-[var(--color-brand)] sm:text-3xl">
                    {formatMoney(transaction.providerShare)}
                  </dd>
                  <p className="mt-2 text-xs text-[var(--color-ink-muted)]">Remaining amount · no transfer occurs</p>
                </div>
              </dl>
              <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
                Fee and share use the shared 10% calculator. This split is illustrative; no settlement, transfer, or payout is performed.
              </p>
            </div>
          </section>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(240px,0.62fr)]">
            <section className="rounded-xl border border-[var(--color-line)] bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-line)] pb-3">
                <div>
                  <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">Simulated lifecycle</h2>
                  <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">A sample flow, not external payment events.</p>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusStyle.pill}`}>
                  {outcomes.find((item) => item.id === outcome)?.label} outcome
                </span>
              </div>
              <ol className="mt-4 space-y-0">
                {transaction.timeline.map((event, index) => (
                  <li key={event.label} className="relative flex gap-3 pb-5 last:pb-0">
                    {index < transaction.timeline.length - 1 && (
                      <span aria-hidden="true" className="absolute bottom-0 left-[13px] top-7 w-px bg-[var(--color-line)]" />
                    )}
                    <span
                      aria-hidden="true"
                      className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
                        index === 0 ? "bg-[var(--color-brand)] text-white" : `${statusStyle.marker} ring-4 ring-white`
                      }`}
                    >
                      {index === 0 ? "✓" : index + 1}
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <p className="font-semibold">{event.label}</p>
                      <p className="mt-0.5 text-sm leading-5 text-[var(--color-ink-muted)]">{event.detail}</p>
                    </div>
                    {index === transaction.timeline.length - 1 && (
                      <span className={`ml-auto hidden shrink-0 self-center rounded-full border px-2 py-1 text-xs font-bold capitalize sm:inline-flex ${statusStyle.pill}`}>
                        {transaction.bookingState.replaceAll("_", " ")}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </section>

            <aside className="rounded-xl border border-[var(--color-line)] bg-white p-4 shadow-sm sm:p-5">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--color-ink-muted)]">Scenario details</p>
              <h2 className="mt-1 font-[family-name:var(--font-display)] text-lg font-bold">A clear example</h2>
              <dl className="mt-4 divide-y divide-[var(--color-line)] border-y border-[var(--color-line)] text-sm">
                <div className="flex items-start justify-between gap-4 py-3">
                  <dt className="text-[var(--color-ink-muted)]">Sample service</dt>
                  <dd className="text-right font-semibold">{transaction.scenario.title}</dd>
                </div>
                <div className="flex items-start justify-between gap-4 py-3">
                  <dt className="text-[var(--color-ink-muted)]">Currency</dt>
                  <dd className="font-semibold">{transaction.currency}</dd>
                </div>
                <div className="flex items-start justify-between gap-4 py-3">
                  <dt className="text-[var(--color-ink-muted)]">Illustrative booking state</dt>
                  <dd className="text-right font-semibold capitalize">{transaction.bookingState.replaceAll("_", " ")}</dd>
                </div>
                <div className="flex items-start justify-between gap-4 py-3">
                  <dt className="text-[var(--color-ink-muted)]">Saved anywhere?</dt>
                  <dd className="font-semibold">No</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs leading-5 text-[var(--color-ink-muted)]">
                The sample outcome changes the illustration only. It does not create a booking or initiate a payment.
              </p>
            </aside>
          </div>
        </section>
      </div>
      {!embedded && <ConnectLearningResources />}
    </div>
  );
}
