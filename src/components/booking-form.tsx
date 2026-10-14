"use client";

import Link from "next/link";
import { useState } from "react";
import { FeeExplainer } from "@/components/fee-explainer";
import { formatNgnFromKobo } from "@/lib/format";

type PaymentChoice = "simulated" | "test" | "live";

export function BookingForm({
  listingId,
  priceKobo,
  sampleBookingId,
}: {
  listingId: string;
  priceKobo: number;
  sampleBookingId?: string;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [when, setWhen] = useState("");
  const [mode, setMode] = useState<PaymentChoice>("simulated");
  const [submitted, setSubmitted] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-5">
        <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-amber-950">
          Booking UI captured locally — not persisted
        </h3>
        <p className="mt-2 text-sm text-amber-900/90">
          Milestone 1 is interface-only. Your details were not saved and no
          payment was started for listing <code>{listingId}</code>. Persistence
          and a labelled mock payment flow arrive in Milestone 2.
        </p>
        {sampleBookingId && (
          <p className="mt-4 text-sm">
            <Link
              href={`/bookings/${sampleBookingId}`}
              className="font-semibold text-[var(--color-brand)] underline-offset-4 hover:underline"
            >
              View a seed booking example →
            </Link>
          </p>
        )}
        <button
          type="button"
          className="mt-4 text-sm font-medium text-amber-950 underline"
          onClick={() => setSubmitted(false)}
        >
          Back to form
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label htmlFor="customer-name" className="label">
          Your name
        </label>
        <input
          id="customer-name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="field"
          placeholder="Amaka Nwosu"
          autoComplete="name"
        />
      </div>
      <div>
        <label htmlFor="customer-email" className="label">
          Email
        </label>
        <input
          id="customer-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="field"
          placeholder="you@example.com"
          autoComplete="email"
        />
      </div>
      <div>
        <label htmlFor="scheduled-for" className="label">
          Preferred date & time
        </label>
        <input
          id="scheduled-for"
          type="datetime-local"
          required
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          className="field"
        />
      </div>

      <fieldset>
        <legend className="label">Payment mode</legend>
        <p className="mb-3 text-sm text-[var(--color-ink-muted)]">
          Modes are labelled for the demo. Only UI selection works in Milestone
          1 — providers are not wired yet.
        </p>
        <div className="space-y-2">
          {(
            [
              {
                value: "simulated" as const,
                title: "Simulated",
                detail: "App-local mock (Milestone 2)",
                enabled: true,
              },
              {
                value: "test" as const,
                title: "Test",
                detail: "Stripe / Paystack test mode (later milestones)",
                enabled: false,
              },
              {
                value: "live" as const,
                title: "Live",
                detail: "Real money — disabled until explicitly enabled",
                enabled: false,
              },
            ] as const
          ).map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-3 ${
                mode === option.value
                  ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)]"
                  : "border-[var(--color-line)] bg-[var(--color-surface)]"
              } ${!option.enabled ? "opacity-60" : ""}`}
            >
              <input
                type="radio"
                name="payment-mode"
                value={option.value}
                checked={mode === option.value}
                disabled={!option.enabled}
                onChange={() => setMode(option.value)}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-semibold text-[var(--color-ink)]">
                  {option.title}
                  {!option.enabled && (
                    <span className="ml-2 text-xs font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
                      unavailable
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-sm text-[var(--color-ink-muted)]">
                  {option.detail}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <FeeExplainer amountKobo={priceKobo} />

      <button type="submit" className="btn-primary w-full sm:w-auto">
        Continue · {formatNgnFromKobo(priceKobo)}
      </button>
      <p className="text-xs text-[var(--color-ink-muted)]">
        We never collect card numbers in this app. Real checkout happens on the
        provider-hosted page in later milestones.
      </p>
    </form>
  );
}
