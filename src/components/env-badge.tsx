import { SEED_META } from "@/data/seed";

export function EnvBadge({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-md border border-amber-300/80 bg-amber-50 text-amber-950 ${
        compact ? "px-2 py-0.5 text-xs" : "px-3 py-1.5 text-sm"
      }`}
      role="status"
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden />
      <span className="font-medium tracking-wide">{SEED_META.label}</span>
      {!compact && (
        <span className="hidden text-amber-800/80 sm:inline">
          · {SEED_META.note}
        </span>
      )}
    </div>
  );
}

export function PaymentModeLegend() {
  const modes = [
    {
      key: "simulated",
      label: "Simulated",
      detail: "App-local mock only — not a provider response",
    },
    {
      key: "test",
      label: "Test",
      detail: "Provider test-mode confirmation (Stripe / Paystack)",
    },
    {
      key: "live",
      label: "Live",
      detail: "Real money — disabled by default; never the default",
    },
  ] as const;

  return (
    <ul className="grid gap-3 sm:grid-cols-3">
      {modes.map((mode) => (
        <li key={mode.key} className="border-l-2 border-[var(--color-ink-muted)] pl-3">
          <p className="text-sm font-semibold text-[var(--color-ink)]">{mode.label}</p>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">{mode.detail}</p>
        </li>
      ))}
    </ul>
  );
}
