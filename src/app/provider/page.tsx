import Link from "next/link";
import { EnvBadge } from "@/components/env-badge";
import {
  BookingStatusBadge,
  DataSourceBadge,
  OnboardingBadge,
  PaymentModeBadge,
} from "@/components/status-badge";
import {
  categoryLabels,
  bookings as seedBookings,
  getListing,
  listings,
  listingsForProvider,
  providers,
} from "@/data/seed";
import { formatDateTime, formatMoney } from "@/lib/format";
import { sumMoney } from "@/lib/money";

export default function ProviderPage() {
  const sampleBookings = seedBookings;
  const illustrativePaidShare = sumMoney(
    sampleBookings
      .filter((b) => b.status === "paid")
      .map((booking) => booking.providerShare),
    "NGN",
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-brand)]">
            Seller view
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-ink)] sm:text-4xl">
            Fictional provider examples
          </h1>
          <p className="mt-2 max-w-2xl text-[var(--color-ink-muted)]">
            Fictional seller profiles and static seed bookings only. Runtime
            bookings and signed-in seller data are not shown here.
          </p>
        </div>
        <EnvBadge compact />
      </div>

      <aside className="mt-6 rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-950">
        <strong>Not a secure seller portal.</strong> No authentication is
        implemented. Anyone who can open this URL can view demo booking data.
        Use Deployment Protection / <code>DEMO_ACCESS_TOKEN</code> for public
        shares.
      </aside>

      <aside className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <strong>Illustrative earnings only.</strong> Seed-only example totals;
        runtime bookings are excluded. These are not payouts, settlements, or
        bank credits. No real money moves.
      </aside>

      <dl className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="border-l-2 border-[var(--color-brand)] pl-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
            Fictional providers
          </dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums">
            {providers.length}
          </dd>
        </div>
        <div className="border-l-2 border-[var(--color-brand)] pl-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
            Listings
          </dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums">
            {listings.length}
          </dd>
        </div>
        <div className="border-l-2 border-[var(--color-brand)] pl-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
            Paid share (seed + simulated)
          </dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums text-[var(--color-brand)]">
            {formatMoney(illustrativePaidShare)}
          </dd>
        </div>
      </dl>

      <div className="mt-12 space-y-12">
        {providers.map((provider) => {
          const providerListings = listingsForProvider(provider.id);
          const providerBookings = sampleBookings.filter(
            (b) => b.providerId === provider.id,
          );
          const paidShare = sumMoney(
            providerBookings
              .filter((booking) => booking.status === "paid")
              .map((booking) => booking.providerShare),
            "NGN",
          );

          return (
            <section
              key={provider.id}
              className="border-t border-[var(--color-line)] pt-8"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
                      {provider.name}
                    </h2>
                    <OnboardingBadge status={provider.onboardingStatus} />
                    <DataSourceBadge source="seed" />
                  </div>
                  <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
                    {categoryLabels[provider.category]} · {provider.city} ·{" "}
                    {provider.rating.toFixed(1)} ★ ({provider.reviewCount}{" "}
                    reviews)
                  </p>
                  <p className="mt-3 max-w-2xl text-[var(--color-ink-muted)]">
                    {provider.bio}
                  </p>
                  <p className="mt-2 text-sm text-amber-900">
                    {provider.onboardingNote}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
                    Paid share (illustrative)
                  </p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">
                    {formatMoney(paidShare)}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-amber-800">
                    Payout: {provider.payoutStatus.replaceAll("_", " ")}
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
                  Listings ({providerListings.length})
                </h3>
                {providerListings.length === 0 ? (
                  <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
                    No listings for this provider.
                  </p>
                ) : (
                  <ul className="mt-3 divide-y divide-[var(--color-line)] border-t border-[var(--color-line)]">
                    {providerListings.map((listing) => (
                      <li
                        key={listing.id}
                        className="flex flex-wrap items-baseline justify-between gap-2 py-3"
                      >
                        <Link
                          href={`/listings/${listing.id}`}
                          className="font-medium text-[var(--color-brand)] underline-offset-4 hover:underline"
                        >
                          {listing.title}
                        </Link>
                        <span className="tabular-nums text-sm font-semibold">
                          {formatMoney(listing.price)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
                  Bookings ({providerBookings.length})
                </h3>
                {providerBookings.length === 0 ? (
                  <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
                    No bookings for this provider yet.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {providerBookings.map((booking) => {
                      const listing = getListing(booking.listingId);
                      return (
                        <li
                          key={booking.id}
                          className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] p-4"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/bookings/${booking.id}`}
                              className="font-mono text-sm font-semibold text-[var(--color-brand)] underline-offset-4 hover:underline"
                            >
                              {booking.id}
                            </Link>
                            <BookingStatusBadge status={booking.status} />
                            <PaymentModeBadge mode={booking.paymentMode} />
                            <DataSourceBadge source={booking.dataSource} />
                          </div>
                          <p className="mt-2 text-sm text-[var(--color-ink)]">
                            {listing?.title ?? booking.listingId} ·{" "}
                            {booking.customerName}
                          </p>
                          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
                            Scheduled {formatDateTime(booking.scheduledFor)} ·
                            Customer pays{" "}
                            <span className="font-medium tabular-nums text-[var(--color-ink)]">
                              {formatMoney(booking.amount)}
                            </span>{" "}
                            · Provider share{" "}
                            <span className="font-medium tabular-nums text-[var(--color-ink)]">
                              {formatMoney(booking.providerShare)}
                            </span>
                          </p>
                          <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
                            {booking.statusNote}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
