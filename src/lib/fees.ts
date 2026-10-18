import { PLATFORM_FEE_BPS } from "@/lib/brand";
import {
  assertMinorUnitAmount,
  createMoney,
  minorUnitsFromBigInt,
} from "@/lib/money";
import type { Currency, Money } from "@/types/marketplace";

export interface FeeBreakdown {
  amount: Money;
  platformFee: Money;
  providerShare: Money;
  platformFeeBps: number;
  platformFeePercent: number;
}

/** Illustrative marketplace fee split. Not a settlement or payout. */
export function calculatePlatformFee(
  amountMinor: number,
  currency: Currency,
  platformFeeBps: number = PLATFORM_FEE_BPS,
): FeeBreakdown {
  assertMinorUnitAmount(amountMinor);
  if (
    !Number.isSafeInteger(platformFeeBps) ||
    platformFeeBps < 0 ||
    platformFeeBps > 10_000
  ) {
    throw new Error("platformFeeBps must be an integer between 0 and 10000");
  }

  const amount = createMoney(amountMinor, currency);
  const amountBigInt = BigInt(amountMinor);
  const platformFeeBigInt =
    (amountBigInt * BigInt(platformFeeBps)) / BigInt(10_000);
  const providerShareBigInt = amountBigInt - platformFeeBigInt;
  const platformFee = createMoney(
    minorUnitsFromBigInt(platformFeeBigInt),
    currency,
  );
  const providerShare = createMoney(
    minorUnitsFromBigInt(providerShareBigInt),
    currency,
  );

  return {
    amount,
    platformFee,
    providerShare,
    platformFeeBps,
    platformFeePercent: platformFeeBps / 100,
  };
}
