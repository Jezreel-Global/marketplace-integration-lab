import Link from "next/link";
import { DemoAccessForm } from "@/components/demo-access-form";

export default function DemoAccessPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <Link
        href="/"
        className="text-sm font-medium text-[var(--color-brand)] underline-offset-4 hover:underline"
      >
        ← Marketplace
      </Link>
      <h1 className="mt-6 font-[family-name:var(--font-display)] text-3xl font-bold">
        Demo dashboard access
      </h1>
      <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
        This shared code only gates the demo dashboards. It is not an account or
        authentication system. Ask the demo host for the code; it is submitted
        securely to the server and is not placed in the page URL.
      </p>
      <DemoAccessForm />
    </main>
  );
}
