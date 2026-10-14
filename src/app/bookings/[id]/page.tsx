import Link from "next/link";
import { notFound } from "next/navigation";
import { FeeExplainer } from "@/components/fee-explainer";
import {
  BookingStatusBadge,
  DataSourceBadge,
  PaymentModeBadge,
  PaymentStatusBadge,
} from "@/components/status-badge";
import {
  getBooking,
  getListing,
  getProvider,
  paymentAttempts,
} from "@/data/seed";
import { formatDateTime, formatNgnFromKobo } from "@/lib/format";

export default async function BookingPage({
  params,
}: PageProps<"/bookings/[id]">) {
  const { id } = await params;
  const booking = getBooking(id);
  if (!booking) notFound();

  const listing = getListing(booking.listingId);
  const provider = getProvider(booking.providerId);
  const attempts = paymentAttempts.filter((p) => p.bookingId === booking.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <Link
        href="/"
        className="text-sm font-medium text-[var(--color-brand)] underline-offset-4 hover:underline"
      >
        ← Marketplace
      </Link>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <DataSourceBadge source={booking.dataSource} />
        <BookingStatusBadge status={booking.status} />
        <PaymentModeBadge mode={booking.paymentMode} />
      </div>

      <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-bold">
        Booking status
      </h1>
      <p className="mt-2 text-[var(--color-ink-muted)]">{booking.statusNote}</p>

      {booking.status === "paid" && booking.dataSource === "seed" && (
        <div
          className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          This booking is labelled <strong>paid</strong> only as illustrative
          seed data. It is not a Stripe or Paystack confirmation.
        </div>
      )}

      <dl className="mt-8 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
            Booking ID
          </dt>
          <dd className="mt-1 font-mono text-sm">{booking.id}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
            Amount
          </dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums">
            {formatNgnFromKobo(booking.amountKobo)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
            Customer
          </dt>
          <dd className="mt-1">
            {booking.customerName}
            <br />
            <span className="text-sm text-[var(--color-ink-muted)]">
              {booking.customerEmail}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
            Scheduled
          </dt>
          <dd className="mt-1">{formatDateTime(booking.scheduledFor)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
            Service
          </dt>
          <dd className="mt-1">
            {listing ? (
              <Link
                href={`/listings/${listing.id}`}
                className="font-medium text-[var(--color-brand)] underline-offset-4 hover:underline"
              >
                {listing.title}
              </Link>
            ) : (
              booking.listingId
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
            Provider
          </dt>
          <dd className="mt-1">
            {provider?.name ?? booking.providerId}
            <span className="mt-1 block text-xs uppercase tracking-wide text-amber-800">
              Mock seller profile
            </span>
          </dd>
        </div>
      </dl>

      <div className="mt-8">
        <FeeExplainer amountKobo={booking.amountKobo} />
      </div>

      <section className="mt-10">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Payment attempts
        </h2>
        {attempts.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
            No payment attempts recorded for this booking.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {attempts.map((attempt) => (
              <li
                key={attempt.id}
                className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <PaymentStatusBadge status={attempt.status} />
                  <PaymentModeBadge mode={attempt.mode} />
                  <DataSourceBadge source={attempt.dataSource} />
                </div>
                <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
                  {attempt.note}
                </p>
                <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
                  Provider: {attempt.provider} ·{" "}
                  {formatDateTime(attempt.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
