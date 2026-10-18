import { PLATFORM_FEE_BPS } from "@/lib/brand";
import { calculatePlatformFee } from "@/lib/fees";
import { formatMoney } from "@/lib/format";
import type { Money } from "@/types/marketplace";

export function FeeExplainer({ amount }: { amount: Money }) {
  const fees = calculatePlatformFee(amount.amountMinor, amount.currency);

  return (
    <aside className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
      <h3 className="font-[family-name:var(--font-display)] text-base font-semibold text-[var(--color-ink)]">
        Illustrative fee split
      </h3>
      <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
        Platform takes {fees.platformFeePercent}% ({PLATFORM_FEE_BPS} bps). This
        is a calculation for learning — not a completed settlement or payout.
      </p>
      <dl className="mt-4 grid gap-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--color-ink-muted)]">Customer pays</dt>
          <dd className="font-medium tabular-nums">
            {formatMoney(fees.amount)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--color-ink-muted)]">Platform fee</dt>
          <dd className="font-medium tabular-nums">
            {formatMoney(fees.platformFee)}
          </dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-[var(--color-line)] pt-2">
          <dt className="text-[var(--color-ink-muted)]">Provider share</dt>
          <dd className="font-semibold tabular-nums text-[var(--color-brand)]">
            {formatMoney(fees.providerShare)}
          </dd>
        </div>
      </dl>
    </aside>
  );
}
