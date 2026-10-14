"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { submitDemoAccessToken } from "@/app/actions/demo-access";

export function DemoAccessForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    const value = formData.get("access-token");

    startTransition(async () => {
      const result = await submitDemoAccessToken(value);
      if (!result.ok) {
        setError(result.error ?? "Demo access could not be granted.");
        return;
      }
      router.replace("/admin");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <label htmlFor="access-token" className="label">
        Shared demo access code
      </label>
      <input
        id="access-token"
        name="access-token"
        type="password"
        autoComplete="off"
        required
        className="field"
        disabled={pending}
      />
      {error ? (
        <p className="text-sm text-rose-800" role="alert">
          {error}
        </p>
      ) : null}
      <button className="btn-primary" type="submit" disabled={pending}>
        {pending ? "Checking…" : "Continue to demo dashboard"}
      </button>
    </form>
  );
}
