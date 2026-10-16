"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  cancelBookingAction,
  simulatePaymentAction,
} from "@/app/actions/bookings";
import type { Booking } from "@/types/marketplace";

export function BookingActionsPanel({
  booking,
}: {
  booking: Pick<Booking, "id" | "status" | "dataSource">;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const isRuntimeMock = booking.dataSource === "mock";
  const canPay =
    isRuntimeMock &&
    (booking.status === "pending_payment" ||
      booking.status === "payment_failed");
  const canCancel =
    isRuntimeMock &&
    (booking.status === "pending_payment" ||
      booking.status === "payment_failed");

  function run(
    action: () => Promise<{ ok: true } | { ok: false; error: string }>,
    successMessage: string,
  ) {
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setInfo(successMessage);
      router.refresh();
    });
  }

  if (booking.dataSource === "seed") {
    return (
      <aside className="mt-8 rounded-lg border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
          Seed illustration — read-only
        </h2>
        <p className="mt-2">
          This booking lives in the immutable seed catalog. Simulated payments
          and cancellations apply only to bookings you create from a listing
          (stored in Neon Postgres runtime tables).
        </p>
        {booking.status === "paid" && (
          <p className="mt-2 font-medium">
            The “paid” label here is illustrative seed data — not a real or
            simulated provider confirmation.
          </p>
        )}
      </aside>
    );
  }

  if (!canPay && !canCancel) {
    return (
      <aside className="mt-8 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] p-5 text-sm text-[var(--color-ink-muted)]">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--color-ink)]">
          Simulated payment controls
        </h2>
        <p className="mt-2">
          No further simulated actions are available for status{" "}
          <strong>{booking.status.replaceAll("_", " ")}</strong>. Use the
          documented demo reset (never an automatic wipe) for a clean runtime
          table.
        </p>
        {info && <p className="mt-3 text-[var(--color-brand)]">{info}</p>}
        {error && (
          <p className="mt-3 text-rose-800" role="alert">
            {error}
          </p>
        )}
      </aside>
    );
  }

  return (
    <aside className="mt-8 rounded-lg border border-amber-300 bg-amber-50 p-5">
      <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-amber-950">
        Simulated payment (local demo)
      </h2>
      <p className="mt-2 text-sm text-amber-900/90">
        These buttons only update the runtime demo store. They do{" "}
        <strong>not</strong> call Stripe or Paystack, authorize cards, or move
        real money. A “success” label is still a simulation.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        {canPay && (
          <>
            <button
              type="button"
              className="btn-primary"
              disabled={pending}
              onClick={() =>
                run(
                  async () => {
                    const result = await simulatePaymentAction(
                      booking.id,
                      "success",
                    );
                    return result.ok
                      ? { ok: true as const }
                      : { ok: false as const, error: result.error };
                  },
                  "Simulated success recorded. No real money moved.",
                )
              }
            >
              {pending ? "Working…" : "Simulate success"}
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-900 disabled:opacity-60"
              disabled={pending}
              onClick={() =>
                run(
                  async () => {
                    const result = await simulatePaymentAction(
                      booking.id,
                      "failure",
                    );
                    return result.ok
                      ? { ok: true as const }
                      : { ok: false as const, error: result.error };
                  },
                  "Simulated failure recorded. No real money moved.",
                )
              }
            >
              Simulate failure
            </button>
          </>
        )}
        {canCancel && (
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md border border-[var(--color-line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-ink)] disabled:opacity-60"
            disabled={pending}
            onClick={() =>
              run(
                async () => {
                  const result = await cancelBookingAction(booking.id);
                  return result.ok
                    ? { ok: true as const }
                    : { ok: false as const, error: result.error };
                },
                "Demo booking cancelled.",
              )
            }
          >
            Cancel booking
          </button>
        )}
      </div>

      {info && (
        <p className="mt-3 text-sm font-medium text-[var(--color-brand)]" role="status">
          {info}
        </p>
      )}
      {error && (
        <p className="mt-3 text-sm text-rose-800" role="alert">
          {error}
        </p>
      )}
    </aside>
  );
}
