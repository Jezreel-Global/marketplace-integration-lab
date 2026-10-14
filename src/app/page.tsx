import Link from "next/link";
import { EnvBadge, PaymentModeLegend } from "@/components/env-badge";
import { HeroVisual } from "@/components/hero-visual";
import { ListingCard } from "@/components/listing-card";
import { bookings, getProvider, listings, SEED_META } from "@/data/seed";
import { BRAND } from "@/lib/brand";

export default function HomePage() {
  return (
    <>
      <section className="relative min-h-[min(92vh,720px)] overflow-hidden border-b border-[var(--color-line)]">
        <div className="absolute inset-0 opacity-90" aria-hidden>
          <HeroVisual />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-canvas)] via-[var(--color-canvas)]/88 to-transparent" />
        <div className="relative mx-auto flex min-h-[min(92vh,720px)] max-w-6xl items-center px-4 py-16 sm:px-6">
          <div className="rise-in max-w-xl">
            <p className="font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-tight text-[var(--color-brand)] sm:text-5xl lg:text-6xl">
              {BRAND.name}
            </p>
            <h1 className="mt-5 text-xl font-medium leading-snug text-[var(--color-ink)] sm:text-2xl">
              {BRAND.tagline}
            </h1>
            <p className="mt-3 text-[var(--color-ink-muted)]">
              Explore fictional Nigerian services and labelled payment modes —
              before any real money moves.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a href="#services" className="btn-primary">
                Browse services
              </a>
              <EnvBadge compact />
            </div>
          </div>
        </div>
      </section>

      <section
        id="services"
        className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16"
      >
        <div className="rise-in-delay-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-ink)] sm:text-3xl">
              Service marketplace
            </h2>
            <p className="mt-1 max-w-xl text-[var(--color-ink-muted)]">
              Seven fictional listings across Nigeria. Prices are in NGN; every
              record is labelled mock seed data.
            </p>
          </div>
          <p className="text-sm text-[var(--color-ink-muted)]">
            {listings.length} listings · {SEED_META.environment}
          </p>
        </div>

        <div className="mt-8 divide-y divide-[var(--color-line)] border-t border-[var(--color-line)]">
          {listings.map((listing) => {
            const provider = getProvider(listing.providerId);
            if (!provider) return null;
            return (
              <ListingCard
                key={listing.id}
                listing={listing}
                provider={provider}
              />
            );
          })}
        </div>
      </section>

      <section className="border-t border-[var(--color-line)] bg-[var(--color-surface)]/60">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-ink)]">
            Payment mode labels
          </h2>
          <p className="mt-1 max-w-2xl text-[var(--color-ink-muted)]">
            Later milestones wire providers. The UI will always distinguish
            these states so a success URL never silently means “paid”.
          </p>
          <div className="mt-6">
            <PaymentModeLegend />
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              {
                title: "Customer",
                body: "Browse, book, and track status with visible payment modes.",
                href: "#services",
              },
              {
                title: "Provider",
                body: "See listings, bookings, and illustrative earnings — never invented payouts.",
                href: "/provider",
              },
              {
                title: "Admin",
                body: "Inspect bookings, fee math, and a webhook feed ready for real events.",
                href: "/admin",
              },
            ].map((role) => (
              <Link
                key={role.title}
                href={role.href}
                className="block border-l-2 border-[var(--color-brand)] pl-4 transition-opacity hover:opacity-80"
              >
                <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold">
                  {role.title}
                </h3>
                <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
                  {role.body}
                </p>
              </Link>
            ))}
          </div>

          <div className="mt-10">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
              Sample bookings (seed)
            </h3>
            <ul className="mt-3 flex flex-wrap gap-3">
              {bookings.map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/bookings/${b.id}`}
                    className="inline-flex rounded-md border border-[var(--color-line)] bg-[var(--color-canvas)] px-3 py-2 text-sm font-medium hover:border-[var(--color-brand)]"
                  >
                    {b.id.replace("book_", "")}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
