import Link from "next/link";
import { Suspense } from "react";
import { EnvBadge, PaymentModeLegend } from "@/components/env-badge";
import { HeroVisual } from "@/components/hero-visual";
import { ListingCard } from "@/components/listing-card";
import { getProvider, listings, SEED_META } from "@/data/seed";
import { BRAND } from "@/lib/brand";

export default function HomePage({
  searchParams,
}: PageProps<"/">) {
  return (
    <>
      <Suspense fallback={null}>
        <DemoGateNotice searchParams={searchParams} />
      </Suspense>
      <section className="overflow-hidden border-b border-[var(--color-line)] bg-[var(--color-canvas)]">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:min-h-[600px] lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)] lg:gap-12 lg:py-14">
          <div className="rise-in max-w-xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-accent)]">
              {BRAND.name}
            </p>
            <h1 className="mt-3 max-w-[18ch] font-[family-name:var(--font-display)] text-3xl font-bold leading-tight tracking-tight text-[var(--color-ink)] sm:text-4xl lg:text-[2.75rem]">
              {BRAND.tagline}
            </h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-[var(--color-ink-muted)]">
              Explore fictional Nigerian services and labelled payment modes —
              before any real money moves.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <a href="#services" className="btn-primary min-h-11 w-full sm:w-auto">
                Browse listings
              </a>
              <Link
                href="/playground"
                className="focus-ring inline-flex min-h-11 w-full items-center justify-center rounded-md border border-[var(--color-brand)] px-4 py-2 font-semibold text-[var(--color-brand)] transition-colors hover:bg-[var(--color-brand-soft)] sm:w-auto"
              >
                Open payment playground
              </Link>
              <Link
                href="/sign-up"
                className="focus-ring inline-flex min-h-11 w-full items-center justify-center rounded-md border border-[var(--color-line)] bg-white px-4 py-2 font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface)] sm:w-auto"
              >
                Become a seller
              </Link>
            </div>
            <p className="mt-4 text-sm leading-6 text-[var(--color-ink-muted)]">
              Already have an account?{" "}
              <Link
                href="/sign-in"
                className="font-semibold text-[var(--color-brand)] underline underline-offset-4"
              >
                Sign in
              </Link>
              {" · "}
              <Link
                href="/sign-up"
                className="font-semibold text-[var(--color-brand)] underline underline-offset-4"
              >
                Create account
              </Link>
            </p>
            <div className="mt-4">
              <EnvBadge compact />
            </div>
          </div>
          <div className="rise-in-delay hidden md:block">
            <div className="overflow-hidden rounded-xl border border-[var(--color-line)] bg-white/80 p-3 shadow-sm sm:p-5">
              <div className="aspect-[12/7] overflow-hidden rounded-lg bg-[var(--color-canvas)]">
                <HeroVisual />
              </div>
              <p className="px-1 pt-3 text-xs font-medium text-[var(--color-ink-muted)]">
                Customer booking → platform fee → provider share · simulated
              </p>
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
          <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">
            Try the <Link href="/playground" className="text-[var(--color-brand)] underline">browser-only payment playground</Link> for a guided fee split and sample lifecycle.
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
                title: "Provider examples",
                body: "Sample provider bookings only. This is not an authenticated seller portal.",
                href: "/provider",
              },
              {
                title: "Admin tools",
                body: "Inspect seed and simulated records. Access requires an allowlisted Clerk administrator account.",
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

        </div>
      </section>
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
