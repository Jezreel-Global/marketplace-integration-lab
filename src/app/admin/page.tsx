import Link from "next/link";
import { connection } from "next/server";
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
import { getStripeConnectReadiness } from "@/lib/stripe/config";
import { formatDateTime, formatNgnFromKobo } from "@/lib/format";
import type { Booking, BookingStatus, PaymentAttemptRecord } from "@/types/marketplace";

function countByStatus(bookings: Booking[], status: BookingStatus) {
  return bookings.filter((b) => b.status === status).length;
}

export default async function AdminPage() {
  await connection();
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

  const totalGross = bookings.reduce((sum, b) => sum + b.amountKobo, 0);
  const totalPlatformFees = bookings.reduce(
    (sum, b) => sum + b.platformFeeKobo,
    0,
  );
  const totalProviderShare = bookings.reduce(
    (sum, b) => sum + b.providerShareKobo,
    0,
  );

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
        <strong>Not a secure admin system.</strong> This route has no login.
        Treat it as a hackathon inspection panel. Prefer Vercel Deployment
        Protection and/or <code>DEMO_ACCESS_TOKEN</code> on public demos.
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
          Booking status summary
        </h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ["pending_payment", "Pending payment"],
              ["paid", "Paid (seed or simulated)"],
              ["cancelled", "Cancelled"],
              ["payment_failed", "Payment failed"],
            ] as const
          ).map(([status, label]) => (
            <div
              key={status}
              className="border-l-2 border-[var(--color-brand)] pl-4"
            >
              <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
                {label}
              </dt>
              <dd className="mt-1 flex items-center gap-2 text-2xl font-semibold tabular-nums">
                {countByStatus(bookings, status)}
                <BookingStatusBadge status={status} />
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-10">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Fee math across bookings
        </h2>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          Platform fee rate: {PLATFORM_FEE_BPS / 100}% ({PLATFORM_FEE_BPS} bps).
          Figures include every seed and runtime booking amount, regardless of
          status.
        </p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="border-l-2 border-[var(--color-line)] pl-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
              Gross (customer)
            </dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">
              {formatNgnFromKobo(totalGross)}
            </dd>
          </div>
          <div className="border-l-2 border-[var(--color-line)] pl-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
              Platform fees
            </dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">
              {formatNgnFromKobo(totalPlatformFees)}
            </dd>
          </div>
          <div className="border-l-2 border-[var(--color-line)] pl-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
              Provider share
            </dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums text-[var(--color-brand)]">
              {formatNgnFromKobo(totalProviderShare)}
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-10">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          All bookings
        </h2>
        {bookings.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
            No bookings available.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {bookings.map((booking) => {
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
                    <DataSourceBadge source={booking.dataSource} />
                  </div>
                  <p className="mt-2 text-sm">
                    {listing?.title ?? booking.listingId} ·{" "}
                    {provider?.name ?? booking.providerId} ·{" "}
                    {booking.customerName}
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
                    {formatNgnFromKobo(booking.amountKobo)} · fee{" "}
                    {formatNgnFromKobo(booking.platformFeeKobo)} · provider{" "}
                    {formatNgnFromKobo(booking.providerShareKobo)} · created{" "}
                    {formatDateTime(booking.createdAt)}
                  </p>
                  <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
                    {booking.statusNote}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Payment attempts
        </h2>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          {paymentAttempts.length} attempt
          {paymentAttempts.length === 1 ? "" : "s"} (seed + runtime). Provider
          field shows <code>none</code> or <code>mock</code> — never a live
          charge.
        </p>
        {paymentAttempts.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
            No payment attempts yet.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {paymentAttempts.map((attempt) => (
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
                  <DataSourceBadge source={attempt.dataSource} />
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
                  {formatNgnFromKobo(attempt.amountKobo)} ·{" "}
                  {formatDateTime(attempt.createdAt)}
                </p>
                <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
                  {attempt.note}
                </p>
              </li>
            ))}
          </ul>
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
