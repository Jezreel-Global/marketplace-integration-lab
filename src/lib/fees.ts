import { PLATFORM_FEE_BPS } from "@/lib/brand";

export interface FeeBreakdown {
  amountKobo: number;
  platformFeeKobo: number;
  providerShareKobo: number;
  platformFeeBps: number;
  platformFeePercent: number;
}

/** Illustrative marketplace fee split. Not a settlement or payout. */
export function calculatePlatformFee(
  amountKobo: number,
  platformFeeBps: number = PLATFORM_FEE_BPS,
): FeeBreakdown {
  if (!Number.isInteger(amountKobo) || amountKobo < 0) {
    throw new Error("amountKobo must be a non-negative integer");
  }
  if (!Number.isInteger(platformFeeBps) || platformFeeBps < 0 || platformFeeBps > 10_000) {
    throw new Error("platformFeeBps must be an integer between 0 and 10000");
  }

  const platformFeeKobo = Math.floor((amountKobo * platformFeeBps) / 10_000);
  const providerShareKobo = amountKobo - platformFeeKobo;

  return {
    amountKobo,
    platformFeeKobo,
    providerShareKobo,
    platformFeeBps,
    platformFeePercent: platformFeeBps / 100,
  };
}
