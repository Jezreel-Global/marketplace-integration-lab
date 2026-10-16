"use client";

import { useActionState } from "react";
import { createSellerProfileAction } from "@/app/actions/seller-profile";

const initialState = { status: "idle" as const };

export function SellerProfileForm() {
  const [state, action, pending] = useActionState(
    createSellerProfileAction,
    initialState,
  );

  return (
    <form action={action} className="mt-6 max-w-xl space-y-4">
      <div>
        <label className="label" htmlFor="seller-display-name">
          Seller display name
        </label>
        <input
          id="seller-display-name"
          name="displayName"
          className="input mt-1 w-full"
          minLength={2}
          maxLength={80}
          required
          autoComplete="organization"
        />
        <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
          This profile is linked to your authenticated Clerk account. Do not
          enter payment or banking details.
        </p>
      </div>
      {state.status !== "idle" ? (
        <p
          className={
            state.status === "error"
              ? "text-sm text-rose-800"
              : "text-sm text-emerald-800"
          }
          role="status"
        >
          {state.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-[var(--color-brand)] px-4 py-2 font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Saving profile…" : "Create seller profile"}
      </button>
    </form>
  );
}
