export function ConnectLearningResources() {
  return (
    <section
      aria-labelledby="connect-learning-heading"
      className="overflow-hidden rounded-xl border border-[var(--color-line)] bg-white shadow-sm"
    >
      <div className="border-b border-[var(--color-line)] px-4 py-4 sm:px-5">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--color-accent)]">
          Next steps
        </p>
        <h2
          id="connect-learning-heading"
          className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold"
        >
          Continue learning about Stripe Connect
        </h2>
      </div>
      <div className="grid divide-y divide-[var(--color-line)] sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <article className="p-4 sm:p-5">
          <h3 className="font-semibold text-[var(--color-ink)]">
            AI-assisted starting point
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--color-ink-muted)]">
            If your AI coding tool supports it, use Stripe’s{" "}
            <code className="rounded bg-[var(--color-canvas)] px-1 py-0.5 font-mono text-[var(--color-ink)]">
              connect-recommend
            </code>{" "}
            skill to explore a possible Connect starting point for your platform
            or marketplace business model.
          </p>
          <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm leading-5 text-amber-950">
            AI-generated guidance is a starting point for human review. It does
            not verify Stripe account or country eligibility, guarantee that a
            payment flow is supported, or constitute a verified integration
            configuration.
          </p>
        </article>
        <article className="p-4 sm:p-5">
          <h3 className="font-semibold text-[var(--color-ink)]">
            Stripe Interactive Platform Guide
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--color-ink-muted)]">
            Explore Connect guidance based on your business model and
            monetization strategy.
          </p>
          <a
            href="https://docs.stripe.com/connect/interactive-platform-guide"
            className="focus-ring mt-3 inline-flex min-h-11 items-center rounded-md font-semibold text-[var(--color-brand)] underline decoration-[var(--color-brand)] underline-offset-4 hover:text-[var(--color-accent)]"
          >
            Open Stripe’s Interactive Platform Guide
            <span aria-hidden="true" className="ml-1">
              ↗
            </span>
          </a>
        </article>
      </div>
    </section>
  );
}
