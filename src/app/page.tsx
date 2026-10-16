import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { EnvBadge, PaymentModeLegend } from "@/components/env-badge";
import { HeroVisual } from "@/components/hero-visual";
import { ListingCard } from "@/components/listing-card";
import { getProvider, listings, SEED_META } from "@/data/seed";
import { BRAND } from "@/lib/brand";
import { listAllBookings } from "@/lib/marketplace-repository";
import { getDatabaseUrl } from "@/lib/store/db";
import {
  BookingStatusBadge,
  DataSourceBadge,
} from "@/components/status-badge";

export default function HomePage({
  searchParams,
}: PageProps<"/">) {
  return (
    <>
      <Suspense fallback={null}>
        <DemoGateNotice searchParams={searchParams} />
      </Suspense>
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
                Browse listings
              </a>
              <Link
                href="/sign-up"
                className="rounded-md border border-[var(--color-brand)] px-4 py-2 font-semibold text-[var(--color-brand)] transition-colors hover:bg-[var(--color-brand-soft)]"
              >
                Become a seller
              </Link>
            </div>
            <p className="mt-4 text-sm text-[var(--color-ink-muted)]">
              Already have an account?{" "}
              <Link
                href="/sign-in"
                className="font-semibold text-[var(--color-brand)] underline"
              >
                Sign in
              </Link>
              {" · "}
              <Link
                href="/sign-up"
                className="font-semibold text-[var(--color-brand)] underline"
              >
                Create account
              </Link>
            </p>
            <div className="mt-4">
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
            This demo has no payment-provider integration. Simulated outcomes remain
            distinct from provider-confirmed payment.
          </p>
          <div className="mt-6">
            <PaymentModeLegend />
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                title: "Customer",
                body: "Browse without an account, book with fictional details, and track a simulated outcome.",
                href: "#services",
              },
              {
                title: "Seller",
                body: "Create a Clerk account and seller profile. Seller tools and payouts are not connected.",
                href: "/sign-up",
              },
              {
                title: "Provider demo",
                body: "Sample provider bookings only. This is not an authenticated seller portal.",
                href: "/provider",
              },
              {
                title: "Admin demo",
                body: "Inspect seed and simulated records. This page is not role-protected.",
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
              Bookings (seed + Neon runtime records)
            </h3>
            <Suspense
              fallback={
                <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
                  Loading bookings…
                </p>
              }
            >
              <BookingLinks />
            </Suspense>
          </div>
        </div>
      </section>
    </>
  );
}

async function BookingLinks() {
  await connection();
  const databaseConfigured = Boolean(getDatabaseUrl());
  let bookings;
  try {
    bookings = await listAllBookings();
  } catch {
    return (
      <p className="mt-3 text-sm text-rose-800" role="alert">
        Runtime bookings are temporarily unavailable. Seed listings remain
        available; try again after the database is restored.
      </p>
    );
  }

  if (bookings.length === 0) {
    return (
      <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
        No bookings yet. Create one from a listing.
      </p>
    );
  }

  return (
    <>
      {!databaseConfigured ? (
        <p className="mt-3 text-sm text-amber-800" role="status">
          Neon is not configured. These are seed examples only; booking changes
          are unavailable.
        </p>
      ) : null}
      <ul className="mt-3 flex flex-wrap gap-3">
        {bookings.map((b) => (
          <li key={b.id}>
            <Link
              href={`/bookings/${b.id}`}
              className="inline-flex flex-col gap-1 rounded-md border border-[var(--color-line)] bg-[var(--color-canvas)] px-3 py-2 text-sm font-medium hover:border-[var(--color-brand)]"
            >
              <span className="font-mono">
                {b.id.replace(/^book_(rt_)?/, "")}
              </span>
              <span className="flex flex-wrap gap-1">
                <DataSourceBadge source={b.dataSource} />
                <BookingStatusBadge status={b.status} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}


async function DemoGateNotice({
  searchParams,
}: {
  searchParams: PageProps<"/">["searchParams"];
}) {
  const params = await searchParams;
  const gateParam = params.demo_gate;
  const demoGate =
    gateParam === "required" ||
    (Array.isArray(gateParam) && gateParam.includes("required"));

  if (!demoGate) return null;

  return (
    <div
      className="border-b border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-950 sm:px-6"
      role="status"
    >
      Provider and admin demo views are gated on this deployment. Ask the demo host for
      the shared code and enter it on <Link href="/demo-access">the demo access
      page</Link>. This is not a login system.
    </div>
  );
}
