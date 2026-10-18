import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingActionsPanel } from "@/components/booking-actions-panel";
import { FeeExplainer } from "@/components/fee-explainer";
import { RuntimeDataUnavailable } from "@/components/runtime-data-unavailable";
import {
  BookingStatusBadge,
  DataSourceBadge,
  PaymentModeBadge,
  PaymentStatusBadge,
} from "@/components/status-badge";
import { bookings as seedBookings, getListing, getProvider } from "@/data/seed";
import { requireAdmin } from "@/lib/admin-auth";
import {
  canReadBookingDetails,
  toPublicBookingDisplay,
} from "@/lib/public-booking-view";
import {
  getBookingById,
  listPaymentAttemptsForBooking,
} from "@/lib/marketplace-repository";
import { formatDateTime, formatMoney } from "@/lib/format";
import type { Booking, PaymentAttemptRecord } from "@/types/marketplace";

export default async function BookingPage({
  params,
}: PageProps<"/bookings/[id]">) {
  const { id } = await params;
  const seedBooking = seedBookings.find((candidate) => candidate.id === id);
  let isAdmin = false;
  if (!seedBooking) {
    isAdmin = await requireAdmin().then(
      () => true,
      () => false,
    );
  }

  if (!canReadBookingDetails({ isSeedBooking: Boolean(seedBooking), isAdmin })) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14" role="status">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">
          Booking received
        </h1>
        <p className="mt-3 text-[var(--color-ink-muted)]">
          Runtime booking details and simulated controls are available only in
          the authorized admin demo until bookings can be linked to customer
          accounts.
        </p>
        <Link className="mt-5 inline-block text-[var(--color-brand)] underline" href="/">
          Return to marketplace
        </Link>
      </div>
    );
  }

  let booking: Booking | undefined = seedBooking;
  if (!seedBooking) {
    try {
      booking = await getBookingById(id);
    } catch {
      return (
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
          <RuntimeDataUnavailable title="Booking details are temporarily unavailable" />
        </div>
      );
    }
  }
  if (!booking) notFound();

  const listing = getListing(booking.listingId);
  const provider = getProvider(booking.providerId);
  const displayBooking = isAdmin
    ? booking
    : toPublicBookingDisplay(booking);
  let attempts: PaymentAttemptRecord[];
  try {
    attempts = await listPaymentAttemptsForBooking(booking.id);
  } catch {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <RuntimeDataUnavailable title="Payment-attempt history is temporarily unavailable" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <Link
        href="/"
        className="text-sm font-medium text-[var(--color-brand)] underline-offset-4 hover:underline"
      >
        ← Marketplace
      </Link>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <DataSourceBadge source={displayBooking.dataSource} />
        <BookingStatusBadge status={displayBooking.status} />
        <PaymentModeBadge mode={displayBooking.paymentMode} />
      </div>

      <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-bold">
        Booking status
      </h1>
      <p className="mt-2 text-[var(--color-ink-muted)]">
        {displayBooking.statusNote}
      </p>

      {displayBooking.status === "paid" && displayBooking.dataSource === "seed" && (
        <div
          className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          This booking is labelled <strong>paid</strong> only as illustrative
          seed data. It is not a Stripe or Paystack confirmation, and it is not
          a local simulated payment either.
        </div>
      )}

      {displayBooking.status === "paid" && displayBooking.dataSource === "mock" && (
        <div
          className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          Status is <strong>paid</strong> after a <strong>simulated</strong>{" "}
          demo outcome only. No payment provider confirmed this and no real money
          moved.
        </div>
      )}

      <dl className="mt-8 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
            Amount
          </dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums">
            {formatMoney(displayBooking.amount)}
          </dd>
        </div>
        {isAdmin && booking.dataSource === "mock" ? (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
              Customer
            </dt>
            <dd className="mt-1">{booking.customerName}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
            Scheduled
          </dt>
          <dd className="mt-1">{formatDateTime(displayBooking.scheduledFor)}</dd>
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
              displayBooking.listingId
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
            Provider
          </dt>
          <dd className="mt-1">
            {provider?.name ?? displayBooking.providerId}
            <span className="mt-1 block text-xs uppercase tracking-wide text-amber-800">
              Mock seller profile
            </span>
          </dd>
        </div>
      </dl>

      <div className="mt-8">
        <FeeExplainer amount={displayBooking.amount} />
      </div>

      <BookingActionsPanel
        booking={{ id: booking.id, status: booking.status, dataSource: booking.dataSource }}
      />

      <section className="mt-10">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Payment attempts
        </h2>
        {attempts.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
            No payment attempts recorded for this booking yet.
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
