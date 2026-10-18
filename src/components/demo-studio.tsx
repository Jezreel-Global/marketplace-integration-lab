"use client";

import { useState } from "react";
import Link from "next/link";
import { ConnectLearningResources } from "@/components/connect-learning-resources";
import { PaymentPlayground } from "@/components/payment-playground";
import { formatMoney } from "@/lib/format";
import { PLAYGROUND_SCENARIOS } from "@/lib/payment-playground";
import {
  buildDemoStudioSnapshot,
  filterDemoPayments,
  getDemoPaymentIdForScenario,
  getVisibleDemoPaymentId,
  type DemoPaymentRecord,
} from "@/lib/demo-studio-data";
import type { PlaygroundOutcome, PlaygroundScenarioId } from "@/lib/payment-playground";
import type { Currency } from "@/types/marketplace";

type View = "overview" | "services" | "payments" | "payouts" | "reports" | "earnings" | "account" | "tools" | "learning";
type OutcomeFilter = PlaygroundOutcome | "all";
type CurrencyFilter = Currency | "all";

const navigation: { id: View; label: string; icon: StudioIconName }[] = [
  { id: "overview", label: "Home", icon: "home" },
  { id: "services", label: "Services", icon: "account" },
  { id: "payments", label: "Payments", icon: "payments" },
  { id: "payouts", label: "Payouts", icon: "balance" },
  { id: "reports", label: "Reports", icon: "learning" },
  { id: "earnings", label: "Finances", icon: "balance" },
  { id: "account", label: "Provider account", icon: "account" },
  { id: "tools", label: "Demo tools", icon: "tools" },
  { id: "learning", label: "Learning paths", icon: "learning" },
];

type StudioIconName = "home" | "payments" | "balance" | "account" | "tools" | "learning" | "menu" | "arrow" | "close";

/** Lucide-style outline glyphs, adapted from the icons used in Furever's navigation. */
function StudioIcon({ name, size = 20 }: { name: StudioIconName; size?: number }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" {...common}>
      {name === "home" && <><path d="m3 10 9-7 9 7" /><path d="M5 9v12h14V9M9 21v-7h6v7" /></>}
      {name === "payments" && <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 9h18M7 15h3" /></>}
      {name === "balance" && <><path d="M3 7h18M5 11h14M7 15h10M9 19h6" /><path d="M12 3v4" /></>}
      {name === "account" && <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>}
      {name === "tools" && <><path d="M4 6h16M4 12h10M4 18h16" /><circle cx="17" cy="12" r="2" /><circle cx="8" cy="6" r="2" /></>}
      {name === "learning" && <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5z" /><path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20M8 7h8M8 10h6" /></>}
      {name === "menu" && <><path d="M4 6h16M4 12h16M4 18h16" /></>}
      {name === "arrow" && <><path d="M5 12h14M13 6l6 6-6 6" /></>}
      {name === "close" && <><path d="m6 6 12 12M18 6 6 18" /></>}
    </svg>
  );
}

const outcomeLabels: Record<PlaygroundOutcome, string> = {
  pending: "Pending · simulated",
  success: "Succeeded · simulated",
  failure: "Failed · simulated",
};

const outcomeStyles: Record<PlaygroundOutcome, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  failure: "border-rose-200 bg-rose-50 text-rose-900",
};

function StatusPill({ outcome }: { outcome: PlaygroundOutcome }) {
  return (
    <span data-outcome={outcome} className={`demo-status inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${outcomeStyles[outcome]}`}>
      <span className="demo-status-dot" aria-hidden="true" />
      {outcomeLabels[outcome]}
    </span>
  );
}

function SimulationDisclosure() {
  return (
    <div className="demo-disclosure flex gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm font-bold">Demo data · simulated payments · no real money moves</p>
        <p className="mt-0.5 text-xs leading-5 text-amber-900/80">
          This browser-only studio uses deterministic examples. It does not contact Stripe or Paystack, create an account, save data, or move funds.
        </p>
      </div>
    </div>
  );
}

function PageHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <header className="mb-6">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-accent)]">{eyebrow}</p>
      <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-ink-muted)]">{description}</p>
    </header>
  );
}

function CurrencySummary({ record }: { record: ReturnType<typeof buildDemoStudioSnapshot>["currencySummaries"][number] }) {
  return (
    <section className="overflow-hidden rounded-xl border border-[var(--color-line)] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[var(--color-line)] px-4 py-4 sm:px-5">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">{record.currency} activity</h2>
          <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">{record.paymentCount} fictional booking example</p>
        </div>
        <span className="rounded-md bg-[var(--color-brand-soft)] px-2.5 py-1 text-xs font-bold text-[var(--color-brand)]">{record.currency}</span>
      </div>
      <dl className="divide-y divide-[var(--color-line)]">
        <SummaryLine label="Booking amount snapshot" value={formatMoney({ amountMinor: record.customerAmount, currency: record.currency })} />
        <SummaryLine label="Illustrative platform fee · 10%" value={formatMoney({ amountMinor: record.platformFee, currency: record.currency })} />
        <SummaryLine label="Internal provider share" value={formatMoney({ amountMinor: record.providerShare, currency: record.currency })} emphasis />
      </dl>
      <div className="flex flex-wrap gap-x-4 gap-y-1 bg-[var(--color-canvas)]/70 px-4 py-3 text-xs text-[var(--color-ink-muted)] sm:px-5">
        <span>{record.succeededShare > 0 ? "Includes a succeeded simulation" : "No succeeded simulation"}</span>
        <span>{record.pendingShare > 0 ? "Pending outcome shown" : "No pending outcome"}</span>
        {record.failedCount > 0 && <span>{record.failedCount} failed example</span>}
      </div>
    </section>
  );
}

function SummaryLine({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
      <dt className="text-sm text-[var(--color-ink-muted)]">{label}</dt>
      <dd className={`shrink-0 text-sm tabular-nums ${emphasis ? "font-bold text-[var(--color-brand)]" : "font-semibold"}`}>{value}</dd>
    </div>
  );
}

function PaymentListRow({ record, selected, onSelect }: { record: DemoPaymentRecord; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`focus-ring flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors sm:px-5 ${selected ? "bg-[var(--color-brand-soft)]/50" : "hover:bg-[var(--color-canvas)]/70"}`}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--color-brand-soft)] text-sm font-bold text-[var(--color-brand)]">{record.transaction.scenario.title.slice(0, 1)}</span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{record.transaction.scenario.title}</span>
          <span className="mt-0.5 block truncate text-xs text-[var(--color-ink-muted)]">{record.customer} · {record.transaction.currency}</span>
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-sm font-semibold tabular-nums">{formatMoney(record.transaction.amount)}</span>
        <span className="mt-1 block"><StatusPill outcome={record.transaction.outcome} /></span>
      </span>
    </button>
  );
}

function Overview({
  snapshot,
  onNavigate,
  onSelectPayment,
}: {
  snapshot: ReturnType<typeof buildDemoStudioSnapshot>;
  onNavigate: (view: View) => void;
  onSelectPayment: (id: string) => void;
}) {
  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-accent)]">Marketplace demo</p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">Marketplace overview</h1>
          <p className="mt-2 text-sm text-[var(--color-ink-muted)]">A clear view of sample transactions, fee splits and provider setup.</p>
        </div>
        <button onClick={() => onNavigate("tools")} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-md bg-[var(--color-brand)] px-4 text-sm font-semibold text-white hover:opacity-90">
          Configure demo <span aria-hidden="true">↗</span>
        </button>
      </div>

      <section className="demo-requirements-banner mb-6 flex flex-col gap-4 rounded-lg border bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
        <div>
          <p className="font-semibold">Example provider setup needs attention</p>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">This fictional checklist illustrates an onboarding notice. No verification request was sent.</p>
        </div>
        <button onClick={() => onNavigate("account")} className="focus-ring min-h-10 shrink-0 rounded-md bg-[var(--color-brand)] px-4 text-sm font-semibold text-white hover:brightness-95">See example</button>
      </section>

      <section aria-label="Currency-separated financial overview" className="grid gap-5 xl:grid-cols-2">
        {snapshot.currencySummaries.map((summary) => <CurrencySummary key={summary.currency} record={summary} />)}
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.8fr)]">
        <section className="overflow-hidden rounded-xl border border-[var(--color-line)] bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--color-line)] px-4 py-4 sm:px-5">
            <div><h2 className="font-[family-name:var(--font-display)] text-lg font-bold">Recent payment activity</h2><p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">Fictional records · simulated outcomes</p></div>
            <button onClick={() => onNavigate("payments")} className="focus-ring shrink-0 rounded px-2 py-2 text-sm font-semibold text-[var(--color-brand)] hover:bg-[var(--color-brand-soft)]">All activity →</button>
          </div>
          <div className="divide-y divide-[var(--color-line)] sm:hidden">
            {snapshot.payments.map((record) => (
              <PaymentListRow key={record.id} record={record} selected={false} onSelect={() => { onSelectPayment(record.id); onNavigate("payments"); }} />
            ))}
          </div>
          <div className="hidden overflow-x-auto sm:block">
            <table className="demo-payments-table w-full min-w-[680px] text-left text-sm">
              <thead><tr>{["Amount", "Currency", "Status", "Customer", "Service", "Date"].map((label) => <th key={label}>{label}</th>)}</tr></thead>
              <tbody>
                {snapshot.payments.map((record) => (
                  <tr key={record.id}>
                    <td className="font-semibold tabular-nums">{formatMoney(record.transaction.amount)}</td>
                    <td>{record.transaction.currency}</td>
                    <td><StatusPill outcome={record.transaction.outcome} /></td>
                    <td>{record.customer}</td>
                    <td>{record.transaction.scenario.title}</td>
                    <td>{new Intl.DateTimeFormat("en-NG", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(record.createdAt))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="demo-panel rounded-lg border bg-white p-4 sm:p-5">
          <h2 className="text-lg font-bold">Marketplace split</h2>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">Illustrative booking snapshots, grouped by currency.</p>
          <dl className="mt-4 divide-y divide-[var(--color-line)] border-y border-[var(--color-line)]">
            {snapshot.currencySummaries.map((summary) => (
              <div key={summary.currency} className="grid grid-cols-[1fr_auto] items-center gap-2 py-3 text-sm">
                <dt className="font-semibold">{summary.currency} provider share</dt>
                <dd className="font-bold tabular-nums">{formatMoney({ amountMinor: summary.providerShare, currency: summary.currency })}</dd>
                <span className="text-xs text-[var(--color-ink-muted)]">Internal demo ledger · not paid out</span>
                <button onClick={() => onNavigate("earnings")} className="focus-ring row-span-2 rounded px-2 py-1 text-xs font-semibold text-[var(--color-brand)] hover:bg-[var(--color-brand-soft)]">Details <span aria-hidden="true">→</span></button>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs leading-5 text-[var(--color-ink-muted)]">These figures are not collected revenue, a Stripe balance, or seller earnings.</p>
        </section>
      </section>

      <div className="mt-5 flex flex-col gap-2 rounded-lg border border-[var(--color-line)] bg-white px-4 py-3 text-xs leading-5 text-[var(--color-ink-muted)] sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <p>Illustrative booking snapshots are not collected revenue, a Stripe balance, or provider earnings.</p>
        <button onClick={() => onNavigate("earnings")} className="focus-ring w-fit font-semibold text-[var(--color-brand)] hover:underline">See the earnings explanation →</button>
      </div>
    </>
  );
}

function PaymentDetail({ record }: { record: DemoPaymentRecord }) {
  const transaction = record.transaction;
  return (
    <aside aria-label="Selected transaction details" className="rounded-xl border border-[var(--color-line)] bg-white shadow-sm">
      <div className="border-b border-[var(--color-line)] px-4 py-4 sm:px-5">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-ink-muted)]">Transaction details · simulated</p>
        <h2 className="mt-1 font-[family-name:var(--font-display)] text-lg font-bold">{record.reference}</h2>
      </div>
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs text-[var(--color-ink-muted)]">Customer amount</p><p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold tabular-nums">{formatMoney(transaction.amount)}</p></div><StatusPill outcome={transaction.outcome} /></div>
        <dl className="mt-4 divide-y divide-[var(--color-line)] border-y border-[var(--color-line)]">
          <SummaryLine label="Customer" value={record.customer} />
          <SummaryLine label="Service" value={transaction.scenario.title} />
          <SummaryLine label="Currency" value={transaction.currency} />
          <SummaryLine label="Date" value={new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(new Date(record.createdAt))} />
          <SummaryLine label="Platform fee · illustrative" value={formatMoney(transaction.platformFee)} />
          <SummaryLine label="Provider share · illustrative" value={formatMoney(transaction.providerShare)} emphasis />
        </dl>
        <p className="mt-3 text-xs leading-5 text-[var(--color-ink-muted)]">Fee and provider share are sample ledger values. No payment was collected and no funds were transferred.</p>
        <h3 className="mt-5 text-sm font-bold">Sample lifecycle</h3>
        <ol className="mt-3 space-y-3">{transaction.timeline.map((step, index) => <li key={step.label} className="flex gap-3"><span aria-hidden="true" className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold ${index === 0 ? "bg-[var(--color-brand-soft)] text-[var(--color-brand)]" : outcomeStyles[transaction.outcome]}`}>{index + 1}</span><div><p className="text-xs font-semibold">{step.label}</p><p className="mt-0.5 text-xs leading-5 text-[var(--color-ink-muted)]">{step.detail}</p></div></li>)}</ol>
      </div>
    </aside>
  );
}

function Payments({ snapshot, selectedId, onSelect }: { snapshot: ReturnType<typeof buildDemoStudioSnapshot>; selectedId: string; onSelect: (id: string) => void }) {
  const [currencyFilter, setCurrencyFilter] = useState<CurrencyFilter>("all");
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>("all");
  const records = filterDemoPayments(snapshot.payments, currencyFilter, outcomeFilter);
  const selected = records.find(({ id }) => id === selectedId) ?? records[0];

  function changeFilters(nextCurrency: CurrencyFilter, nextOutcome: OutcomeFilter) {
    setCurrencyFilter(nextCurrency);
    setOutcomeFilter(nextOutcome);
    onSelect(
      getVisibleDemoPaymentId(
        snapshot.payments,
        selectedId,
        nextCurrency,
        nextOutcome,
      ),
    );
  }

  return (
    <>
      <PageHeading eyebrow="Activity" title="Payments" description="Browse the sample payment ledger and inspect the illustrative fee split and simulated lifecycle for each booking." />
      <div className="grid items-start gap-5 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 overflow-hidden rounded-xl border border-[var(--color-line)] bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-[var(--color-line)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div><h2 className="font-semibold">Payment activity</h2><p className="mt-1 text-xs text-[var(--color-ink-muted)]">All rows are deterministic browser fixtures.</p></div>
            <div className="flex flex-wrap gap-2">
              <label className="sr-only" htmlFor="payment-currency-filter">Filter by currency</label>
              <select id="payment-currency-filter" className="field min-h-10 w-auto py-2 text-sm" value={currencyFilter} onChange={(event) => changeFilters(event.target.value as CurrencyFilter, outcomeFilter)}><option value="all">All currencies</option><option value="NGN">NGN</option><option value="USD">USD</option></select>
              <label className="sr-only" htmlFor="payment-outcome-filter">Filter by simulated outcome</label>
              <select id="payment-outcome-filter" className="field min-h-10 w-auto py-2 text-sm" value={outcomeFilter} onChange={(event) => changeFilters(currencyFilter, event.target.value as OutcomeFilter)}><option value="all">All outcomes</option><option value="pending">Pending</option><option value="success">Succeeded</option><option value="failure">Failed</option></select>
            </div>
          </div>
          {records.length === 0 ? (
            <div className="p-8 text-center"><p className="font-semibold">No sample payments match these filters.</p><button className="focus-ring mt-2 rounded px-3 py-2 text-sm font-semibold text-[var(--color-brand)] hover:bg-[var(--color-brand-soft)]" onClick={() => changeFilters("all", "all")}>Clear filters</button></div>
          ) : (
            <div className="divide-y divide-[var(--color-line)] sm:hidden">
              {records.map((record) => <PaymentListRow key={record.id} record={record} selected={selected?.id === record.id} onSelect={() => onSelect(record.id)} />)}
            </div>
          )}
          {records.length > 0 && <div className="hidden overflow-x-auto sm:block"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-[var(--color-canvas)] text-[10px] uppercase tracking-[0.12em] text-[var(--color-ink-muted)]"><tr>{["Reference", "Customer", "Service", "Date", "Currency", "Amount", "Status"].map((label) => <th key={label} className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead><tbody className="divide-y divide-[var(--color-line)]">{records.map((record) => <tr key={record.id} className={selected?.id === record.id ? "bg-[var(--color-brand-soft)]/50" : "hover:bg-[var(--color-canvas)]/60"}><td className="px-4 py-3"><button type="button" aria-pressed={selected?.id === record.id} onClick={() => onSelect(record.id)} className="focus-ring rounded px-1 py-1 font-mono text-xs font-semibold text-[var(--color-brand)]">{record.reference}</button></td><td className="px-4 py-3">{record.customer}</td><td className="px-4 py-3">{record.transaction.scenario.title}</td><td className="px-4 py-3 text-xs text-[var(--color-ink-muted)]">{new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(new Date(record.createdAt))}</td><td className="px-4 py-3 font-medium">{record.transaction.currency}</td><td className="px-4 py-3 font-semibold tabular-nums">{formatMoney(record.transaction.amount)}</td><td className="px-4 py-3"><StatusPill outcome={record.transaction.outcome} /></td></tr>)}</tbody></table></div>}
        </section>
        {selected ? <PaymentDetail record={selected} /> : <div className="rounded-xl border border-dashed border-[var(--color-line)] bg-white p-8 text-center text-sm text-[var(--color-ink-muted)]">Choose a sample payment to inspect its details.</div>}
      </div>
    </>
  );
}

function Services({ onConfigure }: { onConfigure: (scenarioId: PlaygroundScenarioId) => void }) {
  return (
    <>
      <PageHeading eyebrow="Marketplace catalog" title="Services" description="Browse the fixed sample services used in the payment walkthrough. These examples are not listings available for purchase." />
      <section className="demo-panel overflow-hidden rounded-lg border bg-white">
        <div className="border-b border-[var(--color-line)] px-4 py-4 sm:px-5"><h2 className="text-lg font-bold">Example service catalog</h2><p className="mt-1 text-sm text-[var(--color-ink-muted)]">Each service keeps its own currency and minor-unit amount.</p></div>
        <div className="divide-y divide-[var(--color-line)]">
          {PLAYGROUND_SCENARIOS.map((scenario) => (
            <article key={scenario.id} className="flex flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="min-w-0"><p className="font-semibold">{scenario.title}</p><p className="mt-1 text-sm text-[var(--color-ink-muted)]">{scenario.description}</p></div>
              <div className="flex shrink-0 items-center justify-between gap-5 sm:justify-end"><p className="text-right"><span className="block font-bold tabular-nums">{formatMoney(scenario.amount)}</span><span className="mt-0.5 block text-xs text-[var(--color-ink-muted)]">{scenario.amount.currency} sample price</span></p><button type="button" onClick={() => onConfigure(scenario.id)} className="focus-ring min-h-10 rounded-md bg-[var(--color-brand)] px-4 text-sm font-semibold text-white hover:brightness-95">Use example</button></div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function Payouts({ snapshot }: { snapshot: ReturnType<typeof buildDemoStudioSnapshot> }) {
  return (
    <>
      <PageHeading eyebrow="Internal demo ledger" title="Payouts" description="Review payout-shaped examples tied to successful simulated outcomes." />
      <div className="demo-disclosure mb-5 rounded-lg border bg-amber-50 p-4 text-amber-950"><p className="font-bold">Payout previews only</p><p className="mt-1 text-sm leading-6">No balance exists and no payout or transfer was created. A succeeded simulation is only an on-screen outcome.</p></div>
      <section className="demo-panel overflow-hidden rounded-lg border bg-white">
        <div className="border-b border-[var(--color-line)] px-4 py-4 sm:px-5"><h2 className="text-lg font-bold">Example payout activity</h2><p className="mt-1 text-sm text-[var(--color-ink-muted)]">Provider shares are displayed separately by transaction currency.</p></div>
        {snapshot.payoutExamples.length === 0 ? <div className="p-8 text-center text-sm text-[var(--color-ink-muted)]">There are no successful sample outcomes to preview. Choose “Success” in Demo tools to update this illustration.</div> : <div className="overflow-x-auto"><table className="demo-payments-table w-full min-w-[620px] text-left text-sm"><thead><tr>{["Example reference", "Service", "Currency", "Illustrative share", "State"].map((label) => <th key={label}>{label}</th>)}</tr></thead><tbody>{snapshot.payoutExamples.map((record) => <tr key={record.id}><td className="font-mono text-xs">DEMO-PAYOUT-{record.transaction.currency}</td><td>{record.transaction.scenario.title}</td><td>{record.transaction.currency}</td><td className="font-semibold tabular-nums">{formatMoney(record.transaction.providerShare)}</td><td><span className="demo-status rounded border bg-gray-100 px-2 py-1 text-xs text-gray-700">Preview · not initiated</span></td></tr>)}</tbody></table></div>}
      </section>
    </>
  );
}

function Reports({ snapshot }: { snapshot: ReturnType<typeof buildDemoStudioSnapshot> }) {
  return (
    <>
      <PageHeading eyebrow="Sample reporting" title="Reports" description="A compact view of fixture counts and simulated outcomes, grouped by currency." />
      <div className="mb-5 rounded-lg border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink-muted)]">Report figures summarize deterministic browser fixtures. They are not processing volume, collected revenue, Stripe balance activity, or payouts.</div>
      <section className="grid gap-4 xl:grid-cols-2">{snapshot.currencySummaries.map((summary) => <article key={summary.currency} className="demo-panel rounded-lg border bg-white"><div className="border-b border-[var(--color-line)] px-4 py-4"><h2 className="text-lg font-bold">{summary.currency} report</h2><p className="mt-1 text-sm text-[var(--color-ink-muted)]">{summary.paymentCount} fixed example{summary.paymentCount === 1 ? "" : "s"}</p></div><dl className="divide-y divide-[var(--color-line)]"><SummaryLine label="Successful simulations" value={String(snapshot.payments.filter((item) => item.transaction.currency === summary.currency && item.transaction.outcome === "success").length)} /><SummaryLine label="Pending simulations" value={String(snapshot.payments.filter((item) => item.transaction.currency === summary.currency && item.transaction.outcome === "pending").length)} /><SummaryLine label="Failed simulations" value={String(summary.failedCount)} /><SummaryLine label="Illustrative booking amount" value={formatMoney({ amountMinor: summary.customerAmount, currency: summary.currency })} emphasis /></dl></article>)}</section>
    </>
  );
}

function Earnings({ snapshot }: { snapshot: ReturnType<typeof buildDemoStudioSnapshot> }) {
  return (
    <>
      <PageHeading eyebrow="Internal demo ledger" title="Earnings & payouts" description="Keep every currency separate and distinguish a booking split from collected money and an actual payout." />
      <div className="mb-5 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sky-950 sm:p-5"><p className="text-sm font-bold">No transfer or payout is performed</p><p className="mt-1 text-sm leading-6 text-sky-900/80">Amounts below are internal illustrations derived from the sample booking snapshots. They are not Stripe balances, collected revenue, or seller earnings.</p></div>
      <div className="grid gap-5 xl:grid-cols-2">
        {snapshot.currencySummaries.map((summary) => (
          <section key={summary.currency} className="overflow-hidden rounded-xl border border-[var(--color-line)] bg-white shadow-sm">
            <div className="border-b border-[var(--color-line)] px-4 py-4 sm:px-5"><h2 className="font-[family-name:var(--font-display)] text-lg font-bold">{summary.currency} examples</h2><p className="mt-1 text-xs text-[var(--color-ink-muted)]">Status values apply to local simulations only.</p></div>
            <dl className="divide-y divide-[var(--color-line)]">
              <SummaryLine label="Provider share · booking snapshot" value={formatMoney({ amountMinor: summary.providerShare, currency: summary.currency })} emphasis />
              <SummaryLine label="Succeeded example share" value={formatMoney({ amountMinor: summary.succeededShare, currency: summary.currency })} />
              <SummaryLine label="Pending example share" value={formatMoney({ amountMinor: summary.pendingShare, currency: summary.currency })} />
              <SummaryLine label="Failed examples" value={String(summary.failedCount)} />
            </dl>
          </section>
        ))}
      </div>
      <section className="mt-5 overflow-hidden rounded-xl border border-[var(--color-line)] bg-white shadow-sm">
        <div className="border-b border-[var(--color-line)] px-4 py-4 sm:px-5"><h2 className="font-[family-name:var(--font-display)] text-lg font-bold">Payout examples</h2><p className="mt-1 text-xs text-[var(--color-ink-muted)]">Previews based only on succeeded sample outcomes · none were initiated.</p></div>
        {snapshot.payoutExamples.length ? <div className="overflow-x-auto"><table className="w-full min-w-[580px] text-left text-sm"><thead className="bg-[var(--color-canvas)] text-[10px] uppercase tracking-wide text-[var(--color-ink-muted)]"><tr>{["Example reference", "Service", "Currency", "Amount", "Status"].map((label) => <th key={label} className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead><tbody className="divide-y divide-[var(--color-line)]">{snapshot.payoutExamples.map((record) => <tr key={record.id}><td className="px-4 py-4 font-mono text-xs">DEMO-PAYOUT-{record.transaction.currency}</td><td className="px-4 py-4">{record.transaction.scenario.title}</td><td className="px-4 py-4">{record.transaction.currency}</td><td className="px-4 py-4 font-semibold tabular-nums">{formatMoney(record.transaction.providerShare)}</td><td className="px-4 py-4"><span className="rounded-full border border-[var(--color-line)] bg-[var(--color-canvas)] px-2.5 py-1 text-xs font-semibold text-[var(--color-ink-muted)]">Preview · not initiated</span></td></tr>)}</tbody></table></div> : <div className="p-6 text-sm text-[var(--color-ink-muted)]">No succeeded sample outcome is selected, so there is no payout preview to show. Changing the simulation does not initiate a payout.</div>}
      </section>
    </>
  );
}

function ProviderAccount() {
  const checklist = [
    { title: "Business profile", note: "Example details only", state: "Example complete", tone: "success" },
    { title: "Representative information", note: "No identity data collected", state: "Pending · demo", tone: "pending" },
    { title: "Bank account", note: "No payout details collected", state: "Incomplete · demo", tone: "pending" },
    { title: "Requirements review", note: "No external verification performed", state: "Needs attention · demo", tone: "attention" },
  ];
  return (
    <>
      <PageHeading eyebrow="Provider account" title="Onboarding overview" description="A sample business profile and checklist illustrate the kinds of steps a marketplace might present." />
      <div className="mb-5 flex flex-col gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"><div><p className="font-bold text-amber-950">Example requirements notice</p><p className="mt-1 max-w-3xl text-sm leading-6 text-amber-900/80">This notice is fictional. It is not returned by Stripe and does not establish account status, verification, country eligibility, or a supported payment flow.</p></div><span className="w-fit shrink-0 rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900">Needs attention · demo</span></div>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.8fr)]">
        <section className="overflow-hidden rounded-xl border border-[var(--color-line)] bg-white shadow-sm"><div className="border-b border-[var(--color-line)] px-4 py-4 sm:px-5"><h2 className="font-[family-name:var(--font-display)] text-lg font-bold">Example onboarding checklist</h2><p className="mt-1 text-xs text-[var(--color-ink-muted)]">No identity or business details are saved or submitted.</p></div><div className="divide-y divide-[var(--color-line)]">{checklist.map((item) => <div key={item.title} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5"><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{item.title}</p><p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">{item.note}</p></div><span className={`rounded-full border px-2.5 py-1 text-right text-xs font-semibold ${item.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : item.tone === "attention" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-[var(--color-line)] bg-[var(--color-canvas)] text-[var(--color-ink-muted)]"}`}>{item.state}</span></div>)}</div></section>
        <aside className="rounded-xl border border-[var(--color-line)] bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-[var(--color-ink-muted)]">Fictional business profile</p><h2 className="mt-3 font-[family-name:var(--font-display)] text-xl font-bold">Northstar Portrait Studio</h2><p className="mt-1 text-sm text-[var(--color-ink-muted)]">Sample provider · Lagos</p><dl className="mt-5 divide-y divide-[var(--color-line)] border-y border-[var(--color-line)] text-sm"><SummaryLine label="Onboarding" value="Simulated" /><SummaryLine label="Stripe account" value="None" /><SummaryLine label="Data persistence" value="None" /></dl><p className="mt-3 text-xs leading-5 text-[var(--color-ink-muted)]">This provider is a fictional fixture and is not associated with a real seller profile.</p></aside>
      </div>
    </>
  );
}

export function DemoStudio() {
  const [view, setView] = useState<View>("overview");
  const [scenarioId, setScenarioId] = useState<PlaygroundScenarioId>("ngn-portrait");
  const [outcome, setOutcome] = useState<PlaygroundOutcome>("pending");
  const [selectedPaymentId, setSelectedPaymentId] = useState(() => getDemoPaymentIdForScenario("ngn-portrait"));
  const snapshot = buildDemoStudioSnapshot(scenarioId, outcome);
  const title = navigation.find((item) => item.id === view)?.label ?? "Overview";

  function selectScenario(nextScenarioId: PlaygroundScenarioId) {
    setScenarioId(nextScenarioId);
    setSelectedPaymentId(getDemoPaymentIdForScenario(nextScenarioId));
  }

  return (
    <div id="demo-studio-shell" className="demo-studio-shell min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink)]">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="demo-sidebar sticky top-0 z-20 border-b border-[var(--color-line)] bg-white lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-3 px-4 py-4 lg:px-5 lg:py-5">
            <Link href="/" aria-label="Marketplace Lab, return to marketplace home" className="focus-ring flex items-center gap-3 rounded-md"><span className="demo-logo grid h-10 w-10 place-items-center rounded-xl bg-[var(--color-brand)] font-[family-name:var(--font-display)] font-bold text-white">M</span><span><span className="block font-[family-name:var(--font-display)] text-base font-bold">Marketplace Lab</span><span className="block text-xs text-[var(--color-ink-muted)]">Demo Studio</span></span></Link>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-900">Demo</span>
          </div>
          <nav aria-label="Demo Studio sections" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden lg:px-3 lg:pt-4">
            <p className="demo-nav-heading hidden px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-ink-muted)] lg:block">Workspace</p>
            {navigation.slice(0, 7).map((item) => <NavItem key={item.id} item={item} current={view} onSelect={setView} />)}
            <p className="demo-nav-heading demo-nav-divider hidden border-t border-[var(--color-line)] px-3 pb-2 pt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-ink-muted)] lg:block">Presenter resources</p>
            {navigation.slice(7).map((item) => <NavItem key={item.id} item={item} current={view} onSelect={setView} />)}
          </nav>
          <button type="button" className="demo-configure-button fixed bottom-3 left-1/2 z-30 flex min-h-12 -translate-x-1/2 items-center gap-2 rounded-full px-5 text-sm font-bold text-white shadow-lg lg:static lg:mx-4 lg:mb-4 lg:translate-x-0" onClick={() => setView("tools")}>
            <StudioIcon name="tools" size={18} /> Configure demo
          </button>
          <div className="hidden border-t border-[var(--color-line)] p-4 text-xs leading-5 text-[var(--color-ink-muted)] lg:block"><p className="font-semibold text-[var(--color-ink)]">Event learning edition</p><p className="mt-1">Explore marketplace payment concepts with sample data.</p></div>
        </aside>

        <div className="demo-main min-w-0 flex-1 lg:ml-64">
          <div className="demo-topbar sticky top-0 z-10 flex min-h-14 items-center justify-between border-b border-[var(--color-line)] bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8"><div className="flex min-w-0 items-center gap-2 text-sm"><span className="shrink-0 text-[var(--color-ink-muted)]">Demo Studio</span><span className="text-[var(--color-line)]">/</span><span className="truncate font-semibold">{title}</span></div><span className="ml-3 hidden rounded-full bg-[var(--color-canvas)] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink-muted)] sm:inline-flex">Browser-only</span></div>
          <SimulationDisclosure />
          <div className="mx-auto max-w-[1200px] p-4 sm:p-6 lg:p-8">
            {view === "overview" && <Overview snapshot={snapshot} onNavigate={setView} onSelectPayment={setSelectedPaymentId} />}
            {view === "services" && <Services onConfigure={(nextScenario) => { selectScenario(nextScenario); setView("tools"); }} />}
            {view === "payments" && <Payments snapshot={snapshot} selectedId={selectedPaymentId} onSelect={setSelectedPaymentId} />}
            {view === "payouts" && <Payouts snapshot={snapshot} />}
            {view === "reports" && <Reports snapshot={snapshot} />}
            {view === "earnings" && <Earnings snapshot={snapshot} />}
            {view === "account" && <ProviderAccount />}
            {view === "tools" && <><PageHeading eyebrow="Presenter tools" title="Configure a sample transaction" description="Select one scenario and outcome to update the related activity, currency summaries and payout previews in this browser session." /><PaymentPlayground embedded scenarioId={scenarioId} outcome={outcome} onScenarioChange={selectScenario} onOutcomeChange={setOutcome} /></>}
            {view === "learning" && <><PageHeading eyebrow="Stripe resources" title="Continue learning about Stripe Connect" description="Use these resources to explore possible Connect approaches after reviewing the marketplace simulation." /><ConnectLearningResources /></>}
          </div>
        </div>
      </div>
    </div>
  );
}

function NavItem({ item, current, onSelect }: { item: (typeof navigation)[number]; current: View; onSelect: (view: View) => void }) {
  return (
    <button type="button" onClick={() => onSelect(item.id)} aria-current={current === item.id ? "page" : undefined} className={`demo-nav-item focus-ring flex min-h-10 shrink-0 items-center gap-3 whitespace-nowrap rounded-md px-3 text-left text-sm font-medium transition-colors lg:w-full ${current === item.id ? "bg-[var(--color-brand-soft)] text-[var(--color-brand)]" : "text-[var(--color-ink-muted)] hover:bg-[var(--color-canvas)] hover:text-[var(--color-ink)]"}`}>
      <StudioIcon name={item.icon} />
      {item.label}
    </button>
  );
}
