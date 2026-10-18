"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createBookingAction } from "@/app/actions/bookings";
import { FeeExplainer } from "@/components/fee-explainer";
import { formatMoney } from "@/lib/format";
import type { Money } from "@/types/marketplace";

export function BookingForm({
  listingId,
  price,
  sampleBookingId,
}: {
  listingId: string;
  price: Money;
  sampleBookingId?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [when, setWhen] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createBookingAction({
        listingId,
        customerName: name,
        customerEmail: email,
        scheduledFor: when,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/bookings/${result.data.bookingId}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-950">
        <strong>Fictional details only.</strong> Your name and email are saved
        with this demo booking. Do not enter real personal, financial, or
        sensitive information.
      </div>
      <div className="rounded-md border border-amber-300/80 bg-amber-50 px-3 py-2 text-sm text-amber-950">
        A booking is saved to Neon Postgres when configured, with status{" "}
        <strong>pending payment</strong>. Payment is <strong>simulated</strong>;
        no card details are collected and no real money moves.
      </div>

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
          disabled={pending}
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
          disabled={pending}
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
          disabled={pending}
        />
      </div>

      <fieldset>
        <legend className="label">Payment mode</legend>
        <p className="mb-3 text-sm text-[var(--color-ink-muted)]">
          This demo records simulated payment outcomes only. Provider test mode
          and live payments are not available.
        </p>
        <div className="space-y-2">
          {(
            [
              {
                value: "simulated",
                title: "Simulated",
                detail: "Simulated outcome — stored in Neon Postgres runtime records",
                enabled: true,
              },
              {
                value: "test",
                title: "Test",
                detail: "Future provider test integrations are not included in this demo",
                enabled: false,
              },
              {
                value: "live",
                title: "Live",
                detail: "No live payment or payout can be made in this demo",
                enabled: false,
              },
            ] as const
          ).map((option) => (
            <label
              key={option.value}
              className={`flex items-start gap-3 rounded-md border px-3 py-3 ${
                option.enabled
                  ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)]"
                  : "border-[var(--color-line)] bg-[var(--color-surface)] opacity-60"
              }`}
            >
              <input
                type="radio"
                name="payment-mode"
                value={option.value}
                checked={option.value === "simulated"}
                disabled={!option.enabled || pending}
                readOnly={option.value === "simulated"}
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

      <FeeExplainer amount={price} />

      {error && (
        <p className="text-sm text-rose-800" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="btn-primary w-full sm:w-auto"
        disabled={pending}
      >
        {pending
          ? "Saving booking…"
          : `Continue · ${formatMoney(price)}`}
      </button>
      <p className="text-xs text-[var(--color-ink-muted)]">
        We never collect card numbers in this app. Fees are calculated on the
        server from the listing price.
        {sampleBookingId ? (
          <>
            {" "}
            Prefer a static example?{" "}
            <a
              href={`/bookings/${sampleBookingId}`}
              className="font-medium text-[var(--color-brand)] underline-offset-4 hover:underline"
            >
              Open seed booking {sampleBookingId}
            </a>
            .
          </>
        ) : null}
      </p>
    </form>
  );
}
