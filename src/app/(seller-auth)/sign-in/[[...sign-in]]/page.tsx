import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { connection } from "next/server";
import { hasClerkConfiguration } from "@/lib/auth-config";

export const instant = false;

export default async function SignInPage() {
  await connection();

  if (!hasClerkConfiguration()) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold">
          Seller sign-in is not configured
        </h1>
        <p className="mt-3 text-[var(--color-ink-muted)]">
          Add the Clerk development keys described in the README. No seller
          session is simulated when authentication is missing.
        </p>
        <Link
          className="mt-5 inline-block text-[var(--color-brand)] underline"
          href="/#services"
        >
          Browse marketplace listings
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="mb-6 text-3xl font-bold">
        Sign in to your seller account
      </h1>
      <SignIn
        forceRedirectUrl="/seller"
        signInUrl="/sign-in"
        signUpUrl="/sign-up"
      />
    </section>
  );
}
