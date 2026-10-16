import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { connection } from "next/server";
import { hasClerkConfiguration } from "@/lib/auth-config";

export const instant = false;

export default async function SignUpPage() {
  await connection();

  if (!hasClerkConfiguration()) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold">
          Seller registration is not configured
        </h1>
        <p className="mt-3 text-[var(--color-ink-muted)]">
          Add the Clerk development keys described in the README. No
          authenticated session is simulated.
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
      <h1 className="mb-6 text-3xl font-bold">Create a seller account</h1>
      <SignUp forceRedirectUrl="/seller" signInUrl="/sign-in" />
    </section>
  );
}
