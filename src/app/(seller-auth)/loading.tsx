export default function SellerAuthLoading() {
  return (
    <section
      className="mx-auto max-w-3xl px-4 py-12 sm:px-6"
      role="status"
      aria-live="polite"
    >
      <p className="text-sm text-[var(--color-ink-muted)]">
        Loading your account page…
      </p>
    </section>
  );
}
