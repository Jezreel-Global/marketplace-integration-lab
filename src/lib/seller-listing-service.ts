import { randomUUID } from "node:crypto";
import type { MarketplaceStore } from "@/lib/store/types";
import { requireSellerIdentity, type SellerSessionReader } from "@/lib/seller-auth-core";
import { assertMinorUnitAmount, createSellerListingPrice } from "@/lib/money";
import type { SellerListing } from "@/types/marketplace";

type SellerListingFormInput = {
  formData: FormData;
  clerkConfigured: boolean;
  readSession: SellerSessionReader;
  store: MarketplaceStore;
};

function formText(form: FormData, key: string, min: number, max: number): string {
  const value = form.get(key);
  if (typeof value !== "string") throw new Error(`Enter a valid ${key}.`);
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) {
    throw new Error(`Use ${key} with ${min} to ${max} characters.`);
  }
  return trimmed;
}

function parseUsdCents(value: FormDataEntryValue | null): number {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value.trim())) {
    throw new Error("Enter a positive price in USD cents.");
  }
  const cents = BigInt(value.trim());
  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("USD price exceeds the supported amount range.");
  }
  const amount = Number(cents);
  assertMinorUnitAmount(amount);
  return amount;
}

/** Create a USD-only draft with its owner derived from the verified Clerk session. */
export async function createSellerListingFromForm(
  input: SellerListingFormInput,
): Promise<SellerListing> {
  const clerkUserId = await requireSellerIdentity(input.clerkConfigured, input.readSession);
  const title = formText(input.formData, "title", 3, 120);
  const description = formText(input.formData, "description", 10, 2000);
  const availabilityNote = formText(input.formData, "availabilityNote", 2, 240);
  const rawDuration = input.formData.get("durationMinutes");
  if (typeof rawDuration !== "string" || !/^\d+$/.test(rawDuration)) {
    throw new Error("Enter a valid duration in minutes.");
  }
  const durationMinutes = Number(rawDuration);
  if (!Number.isSafeInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 10080) {
    throw new Error("Duration must be between 1 minute and 7 days.");
  }

  const now = new Date().toISOString();
  const listing = {
    id: `seller_listing_${randomUUID().replace(/-/g, "")}`,
    title,
    description,
    price: createSellerListingPrice(parseUsdCents(input.formData.get("priceUsdCents"))),
    durationMinutes,
    availabilityNote,
    status: "draft" as const,
    createdAt: now,
    updatedAt: now,
  };
  return input.store.insertSellerListingForClerkUserId(clerkUserId, listing);
}

/** Read only the authenticated seller's listings. */
export async function listSellerListingsForSession(input: {
  clerkConfigured: boolean;
  readSession: SellerSessionReader;
  store: MarketplaceStore;
}): Promise<SellerListing[]> {
  const clerkUserId = await requireSellerIdentity(input.clerkConfigured, input.readSession);
  return input.store.listSellerListingsForClerkUserId(clerkUserId);
}
