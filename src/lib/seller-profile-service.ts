import { randomUUID } from "node:crypto";
import type { MarketplaceStore } from "@/lib/store/types";
import { StoreError } from "@/lib/store/types";
import {
  requireSellerIdentity,
  type SellerSessionReader,
} from "@/lib/seller-auth-core";
import type { SellerProfile } from "@/types/marketplace";
import { SellerProfileValidationError } from "@/lib/seller-profile-errors";

export type SellerProfileActionState =
  | { status: "idle"; message?: string }
  | { status: "success" | "error"; message: string };

export function validateSellerDisplayName(
  value: FormDataEntryValue | null,
):
  | { ok: true; displayName: string }
  | { ok: false; error: string } {
  if (typeof value !== "string") {
    return { ok: false, error: "Enter a seller display name." };
  }

  const displayName = value.trim();
  if (displayName.length < 2 || displayName.length > 80) {
    return {
      ok: false,
      error: "Use a display name between 2 and 80 characters.",
    };
  }

  return { ok: true, displayName };
}

export async function createOrGetSellerProfileFromForm(input: {
  formData: FormData;
  clerkConfigured: boolean;
  readSession: SellerSessionReader;
  store: MarketplaceStore;
}): Promise<SellerProfile> {
  // The browser supplies only a display name. Identity always comes from Clerk.
  const clerkUserId = await requireSellerIdentity(
    input.clerkConfigured,
    input.readSession,
  );
  const validated = validateSellerDisplayName(
    input.formData.get("displayName"),
  );
  if (!validated.ok) {
    throw new SellerProfileValidationError(validated.error);
  }

  const existing =
    await input.store.getSellerProfileByClerkUserId(clerkUserId);
  if (existing) {
    return existing;
  }

  const profile: SellerProfile = {
    id: randomUUID(),
    clerkUserId,
    displayName: validated.displayName,
    createdAt: new Date().toISOString(),
  };

  try {
    return await input.store.insertSellerProfile(profile);
  } catch (error) {
    // A concurrent tab/request can win the unique identity constraint.
    if (error instanceof StoreError && error.code === "conflict") {
      const concurrent =
        await input.store.getSellerProfileByClerkUserId(clerkUserId);
      if (concurrent) {
        return concurrent;
      }
    }
    throw error;
  }
}
