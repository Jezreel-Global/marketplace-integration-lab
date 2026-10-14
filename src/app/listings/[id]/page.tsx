import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingForm } from "@/components/booking-form";
import { DataSourceBadge } from "@/components/status-badge";
import {
  bookings,
  categoryLabels,
  getListing,
  getProvider,
} from "@/data/seed";
import { formatDuration, formatNgnFromKobo } from "@/lib/format";

export default async function ListingPage({
  params,
}: PageProps<"/listings/[id]">) {
  const { id } = await params;
  const listing = getListing(id);
  if (!listing) notFound();
  const provider = getProvider(listing.providerId);
  if (!provider) notFound();

  const sampleBooking = bookings.find((b) => b.listingId === listing.id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <Link
        href="/#services"
        className="text-sm font-medium text-[var(--color-brand)] underline-offset-4 hover:underline"
      >
        ← Back to marketplace
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-brand)]">
              {categoryLabels[listing.category]} · {provider.city}
            </p>
            <DataSourceBadge source="seed" />
          </div>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-ink)] sm:text-4xl">
            {listing.title}
          </h1>
          <p className="mt-4 text-lg text-[var(--color-ink-muted)]">
            {listing.description}
          </p>

          <dl className="mt-8 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
                Price
              </dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums">
                {formatNgnFromKobo(listing.priceKobo)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
                Duration
              </dt>
              <dd className="mt-1 text-lg font-medium">
                {formatDuration(listing.durationMinutes)}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
                Availability
              </dt>
              <dd className="mt-1">{listing.availabilityNote}</dd>
            </div>
          </dl>

          <section className="mt-10 border-t border-[var(--color-line)] pt-8">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
              Provider profile
            </h2>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-amber-800">
              Mock seller data — not a connected account
            </p>
            <div className="mt-4">
              <p className="text-lg font-semibold">{provider.name}</p>
              <p className="text-sm text-[var(--color-ink-muted)]">
                {provider.city} · {provider.rating.toFixed(1)} ★ (
                {provider.reviewCount} reviews)
              </p>
              <p className="mt-3 max-w-2xl text-[var(--color-ink-muted)]">
                {provider.bio}
              </p>
              <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
                Onboarding: <strong>{provider.onboardingStatus}</strong> —{" "}
                {provider.onboardingNote}
              </p>
            </div>
          </section>
        </div>

        <aside className="h-fit rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5 shadow-[0_16px_40px_-28px_rgba(15,61,50,0.4)] sm:p-6">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
            Create a booking
          </h2>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            Form UI only in Milestone 1. Nothing is charged or persisted.
          </p>
          <div className="mt-5">
            <BookingForm
              listingId={listing.id}
              priceKobo={listing.priceKobo}
              sampleBookingId={sampleBooking?.id ?? "book_pending_demo"}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
