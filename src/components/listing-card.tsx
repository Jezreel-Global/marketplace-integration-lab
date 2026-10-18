import Link from "next/link";
import { categoryLabels } from "@/data/seed";
import { formatDuration, formatMoney } from "@/lib/format";
import type { Listing, ServiceProvider } from "@/types/marketplace";

export function ListingCard({
  listing,
  provider,
}: {
  listing: Listing;
  provider: ServiceProvider;
}) {
  return (
    <article className="group flex flex-col border-b border-[var(--color-line)] py-6 first:pt-0 last:border-b-0 sm:py-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-brand)]">
          {categoryLabels[listing.category]} · {provider.city}
        </p>
        <p className="text-xs font-medium uppercase tracking-wide text-amber-800">
          Mock listing
        </p>
      </div>
      <h3 className="mt-2 font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--color-ink)] transition-colors group-hover:text-[var(--color-brand)] sm:text-2xl">
        <Link href={`/listings/${listing.id}`} className="focus-ring">
          {listing.title}
        </Link>
      </h3>
      <p className="mt-2 max-w-2xl text-[var(--color-ink-muted)]">
        {listing.description}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <span className="font-semibold tabular-nums text-[var(--color-ink)]">
          {formatMoney(listing.price)}
        </span>
        <span className="text-[var(--color-ink-muted)]">
          {formatDuration(listing.durationMinutes)}
        </span>
        <span className="text-[var(--color-ink-muted)]">
          by {provider.name}
        </span>
        <Link
          href={`/listings/${listing.id}`}
          className="ml-auto text-sm font-semibold text-[var(--color-brand)] underline-offset-4 hover:underline"
        >
          View & book
        </Link>
      </div>
    </article>
  );
}
