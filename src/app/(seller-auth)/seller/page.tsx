import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { connection } from "next/server";
import { SellerProfileForm } from "@/components/seller-profile-form";
import { hasClerkConfiguration } from "@/lib/auth-config";
import { getMarketplaceStore } from "@/lib/store";
import { StoreError } from "@/lib/store/types";

export const instant = false;

export default async function SellerProfilePage() {
  await connection();

  if (!hasClerkConfiguration()) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold">Seller profile</h1>
        <p className="mt-3 text-[var(--color-ink-muted)]">
          Seller authentication is not configured. Add Clerk development keys
          as documented in the README. This page never creates a demo session.
        </p>
        <div className="mt-5 flex flex-wrap gap-4">
          <Link className="text-[var(--color-brand)] underline" href="/sign-in">Sign in</Link>
          <Link className="text-[var(--color-brand)] underline" href="/sign-up">Create account</Link>
          <Link className="text-[var(--color-brand)] underline" href="/#services">Browse listings</Link>
        </div>
      </section>
    );
  }

  const { userId } = await auth();
  if (!userId) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold">Seller profile</h1>
        <p className="mt-3 text-[var(--color-ink-muted)]">
          Sign in or create an account to access a seller profile.
        </p>
        <div className="mt-5 flex flex-wrap gap-4">
          <Link className="text-[var(--color-brand)] underline" href="/sign-in">
            Sign in
          </Link>
          <Link className="text-[var(--color-brand)] underline" href="/sign-up">
            Create account
          </Link>
          <Link className="text-[var(--color-brand)] underline" href="/#services">
            Browse listings
          </Link>
        </div>
      </section>
    );
  }

  let profile;
  try {
    profile =
      await getMarketplaceStore().getSellerProfileByClerkUserId(userId);
  } catch (error) {
    const message =
      error instanceof StoreError && error.code === "config"
        ? "Seller profiles require DATABASE_URL and the reviewed 003_seller_profiles.sql migration. No migration is applied automatically."
        : "Seller profile storage is unavailable. Confirm DATABASE_URL points to the intended database and that migration 003_seller_profiles.sql has been applied.";
    return (
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Seller profile unavailable</h1>
            <p className="mt-3 text-amber-900" role="status">{message}</p>
          </div>
          <UserButton />
        </div>
        <div className="mt-5 flex flex-wrap gap-4 text-sm">
          <Link className="text-[var(--color-brand)] underline" href="/seller">Retry</Link>
          <Link className="text-[var(--color-brand)] underline" href="/#services">Browse listings</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-brand)]">
            Authenticated seller account
          </p>
          <h1 className="mt-2 text-3xl font-bold">Seller profile</h1>
        </div>
        <UserButton />
      </div>
      {profile ? (
        <div className="mt-6 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
          <h2 className="font-semibold">{profile.displayName}</h2>
          <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
            This profile belongs to your signed-in account. It is separate from
            fictional marketplace providers and has no Stripe account,
            onboarding status, payment activity, or payout capability.
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <Link className="text-[var(--color-brand)] underline" href="/#services">Browse marketplace listings</Link>
            <Link className="text-[var(--color-brand)] underline" href="/provider">View provider demo (illustrative only)</Link>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-3 max-w-2xl text-[var(--color-ink-muted)]">
            Create a minimal seller profile tied to your authenticated Clerk
            session. It does not connect to a fictional seed provider.
          </p>
          <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
            After setup, browse the public marketplace. The provider demo is illustrative and is not connected to this profile.
          </p>
          <SellerProfileForm />
        </>
      )}
    </section>
  );
}
