import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { EnvBadge } from "@/components/env-badge";
import { RuntimeDataUnavailable } from "@/components/runtime-data-unavailable";
import {
  BookingStatusBadge,
  DataSourceBadge,
  PaymentModeBadge,
  PaymentStatusBadge,
} from "@/components/status-badge";
import { getListing, getProvider, SEED_META, webhookEvents } from "@/data/seed";
import { PLATFORM_FEE_BPS } from "@/lib/brand";
import {
  listAllBookings,
  listAllPaymentAttempts,
} from "@/lib/marketplace-repository";
import { getDatabaseUrl } from "@/lib/store/db";
import { requireAdmin } from "@/lib/admin-auth";
import {
  groupPaymentAttempts,
  summarizeBookingsBySourceAndCurrency,
} from "@/lib/admin-dashboard-summary";
import { getStripeConnectReadiness } from "@/lib/stripe/config";
import {
  formatCurrencyFromMinorUnits,
  formatDateTime,
} from "@/lib/format";
import type { Booking, PaymentAttemptRecord } from "@/types/marketplace";

export default async function AdminPage() {
  await connection();
  const authorized = await requireAdmin().then(
    () => true,
    () => false,
  );
  if (!authorized) notFound();

  let bookings: Booking[];
  let paymentAttempts: PaymentAttemptRecord[];
  try {
    [bookings, paymentAttempts] = await Promise.all([
      listAllBookings(),
      listAllPaymentAttempts(),
    ]);
  } catch {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <RuntimeDataUnavailable title="Admin data is temporarily unavailable" />
      </div>
    );
  }
  const databaseConfigured = Boolean(getDatabaseUrl());
  const stripeReadiness = getStripeConnectReadiness();
  const runtimeCount = bookings.filter((b) => b.dataSource === "mock").length;
  const bookingGroups = summarizeBookingsBySourceAndCurrency(bookings);
  const paymentAttemptGroups = groupPaymentAttempts(paymentAttempts);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-brand)]">
            Platform view
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-ink)] sm:text-4xl">
            Admin overview
          </h1>
          <p className="mt-2 max-w-2xl text-[var(--color-ink-muted)]">
            Merged seed catalog and Neon Postgres runtime bookings/payment
            attempts. No payment providers are connected (
            {SEED_META.environment}).
          </p>
        </div>
        <EnvBadge compact />
      </div>

      <aside className="mt-6 rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-950">
        <strong>Restricted admin demo.</strong> Access requires a verified Clerk
        session whose user ID is in the server-side allowlist. This is an
        inspection panel, not a complete production administration system.
      </aside>

      <aside className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <strong>Seed + simulated data only.</strong> Runtime rows come from
        Postgres ({runtimeCount} mock booking
        {runtimeCount === 1 ? "" : "s"}). Totals are not ledger balances or live
        settlements. Simulated “paid” does not move real money.
      </aside>

      {!databaseConfigured ? (
        <aside className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="status">
          Neon is not configured. This view contains seed examples only; runtime
          records and booking changes are unavailable.
        </aside>
      ) : null}

      <section
        className="mt-4 rounded-lg border border-sky-300 bg-sky-50 px-4 py-3 text-sm text-sky-950"
        aria-labelledby="stripe-readiness-title"
      >
        <h2 id="stripe-readiness-title" className="font-semibold">
          Stripe Connect readiness: {stripeReadiness.label}
        </h2>
        <p className="mt-1">{stripeReadiness.message}</p>
        <p className="mt-1 text-xs">
          Payment operations: unavailable · Country, currency, and capability
          eligibility: unverified
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Booking states by data source and currency
        </h2>
        {bookingGroups.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
            No booking records available.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {bookingGroups.map((group) => (
              <article
                key={`${group.dataSource}:${group.currency}`}
                className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <DataSourceBadge source={group.dataSource} />
                  <span className="text-sm font-semibold">{group.currency}</span>
                  <span className="text-sm text-[var(--color-ink-muted)]">
                    {group.bookings.length} record
                    {group.bookings.length === 1 ? "" : "s"}
                  </span>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {(
                    [
                      ["draft", "Draft"],
                      ["pending_payment", "Pending payment"],
                      ["payment_processing", "Processing"],
                      [
                        "paid",
                        group.dataSource === "seed"
                          ? "Paid · seed label"
                          : group.dataSource === "mock"
                            ? "Paid · simulated"
                            : group.dataSource === "provider_test"
                              ? "Paid · provider test"
                              : "Paid · provider live",
                      ],
                      ["payment_failed", "Payment failed"],
                      ["cancelled", "Cancelled"],
                      ["refunded", "Refunded · labelled only"],
                    ] as const
                  ).map(([status, label]) => (
                    <div key={status}>
                      <dt className="text-xs text-[var(--color-ink-muted)]">
                        {label}
                      </dt>
                      <dd className="mt-1 flex items-center gap-2 font-semibold tabular-nums">
                        {group.statusCounts[status]}
                        <BookingStatusBadge status={status} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Internal demo fee calculations
        </h2>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          Platform fee rate: {PLATFORM_FEE_BPS / 100}% ({PLATFORM_FEE_BPS} bps).
          Values are grouped by source and recorded currency, include all
          booking states, and are not balances, settlements, or payouts.
        </p>
        {bookingGroups.length > 0 ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {bookingGroups.map((group) => (
              <article
                key={`${group.dataSource}:${group.currency}`}
                className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] p-4"
              >
                <h3 className="flex flex-wrap items-center gap-2 font-semibold">
                  <DataSourceBadge source={group.dataSource} />
                  {group.currency} fee math
                </h3>
                <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-[var(--color-ink-muted)]">
                      Gross
                    </dt>
                    <dd className="mt-1 font-semibold tabular-nums">
                      {formatCurrencyFromMinorUnits(group.grossKobo, group.currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-[var(--color-ink-muted)]">
                      Platform share
                    </dt>
                    <dd className="mt-1 font-semibold tabular-nums">
                      {formatCurrencyFromMinorUnits(group.platformFeesKobo, group.currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-[var(--color-ink-muted)]">
                      Provider share
                    </dt>
                    <dd className="mt-1 font-semibold tabular-nums text-[var(--color-brand)]">
                      {formatCurrencyFromMinorUnits(group.providerShareKobo, group.currency)}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <section className="mt-10">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Bookings, separated by source
        </h2>
        {bookings.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
            No bookings available.
          </p>
        ) : (
          <div className="mt-4 space-y-8">
            {bookingGroups.map((group) => (
              <section key={`${group.dataSource}:${group.currency}`}>
                <h3 className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                  <DataSourceBadge source={group.dataSource} />
                  {group.currency} records ({group.bookings.length})
                </h3>
                <ul className="mt-3 space-y-3">
                  {group.bookings.map((booking) => {
                    const listing = getListing(booking.listingId);
                    const provider = getProvider(booking.providerId);
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
                        </div>
                        <p className="mt-2 text-sm">
                          {listing?.title ?? booking.listingId} ·{" "}
                          {provider?.name ?? booking.providerId} ·{" "}
                          {booking.customerName}
                        </p>
                        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
                          {formatCurrencyFromMinorUnits(booking.amountKobo, booking.currency)} · fee{" "}
                          {formatCurrencyFromMinorUnits(booking.platformFeeKobo, booking.currency)} · provider{" "}
                          {formatCurrencyFromMinorUnits(booking.providerShareKobo, booking.currency)} · created{" "}
                          {formatDateTime(booking.createdAt)}
                        </p>
                        <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
                          {booking.statusNote}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Payment attempts
        </h2>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          Seed rows are examples and runtime rows are simulated attempts. No
          listed record represents a live charge or provider confirmation.
        </p>
        {paymentAttempts.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
            No payment attempts yet.
          </p>
        ) : (
          <div className="mt-4 space-y-8">
            {paymentAttemptGroups.map((group) => (
              <section key={`${group.dataSource}:${group.currency}`}>
                <h3 className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                  <DataSourceBadge source={group.dataSource} />
                  {group.currency} attempts ({group.records.length})
                </h3>
                <ul className="mt-3 space-y-3">
                  {group.records.map((attempt) => (
                    <li
                      key={attempt.id}
                      className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-semibold">
                          {attempt.id}
                        </span>
                        <PaymentStatusBadge status={attempt.status} />
                        <PaymentModeBadge mode={attempt.mode} />
                      </div>
                      <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
                        Booking{" "}
                        <Link
                          href={`/bookings/${attempt.bookingId}`}
                          className="font-medium text-[var(--color-brand)] underline-offset-4 hover:underline"
                        >
                          {attempt.bookingId}
                        </Link>{" "}
                        · provider={attempt.provider} ·{" "}
                        {formatCurrencyFromMinorUnits(attempt.amountKobo, attempt.currency)} ·{" "}
                        {formatDateTime(attempt.createdAt)}
                      </p>
                      <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
                        {attempt.note}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Webhook event feed
        </h2>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          Placeholder rows only. This feed does not receive or verify real provider
          events.
        </p>
        <ul className="mt-4 space-y-3">
          {webhookEvents.map((event) => (
            <li
              key={event.id}
              className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-semibold">
                  {event.id}
                </span>
                <DataSourceBadge source={event.dataSource} />
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
                  {event.processed ? "processed" : "unprocessed"}
                </span>
              </div>
              <p className="mt-2 text-sm">
                <span className="font-medium">{event.eventType}</span> ·
                provider={event.provider} · {formatDateTime(event.receivedAt)}
              </p>
              <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
                {event.summary}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
