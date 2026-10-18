import {
  SUPPORTED_CURRENCIES,
  type Currency,
  type Money,
  type SellerListingPrice,
} from "@/types/marketplace";

/** Accepted domain range: zero through MAX_SAFE_INTEGER minor units. */
export const MAX_MINOR_UNIT_AMOUNT = Number.MAX_SAFE_INTEGER;

export function minorUnitsFromBigInt(value: bigint): number {
  if (value < BigInt(0) || value > BigInt(MAX_MINOR_UNIT_AMOUNT)) {
    throw new Error("Money amount exceeds the supported safe integer range.");
  }
  return Number(value);
}

/** Parse PostgreSQL BIGINT values without accepting floats or unsafe numbers. */
export function parseMinorUnits(value: unknown): number {
  let integer: bigint;
  if (typeof value === "bigint") {
    integer = value;
  } else if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new Error("Database money amount is not a safe integer.");
    }
    integer = BigInt(value);
  } else if (typeof value === "string" && /^(0|[1-9]\d*)$/.test(value)) {
    integer = BigInt(value);
  } else {
    throw new Error("Database money amount is invalid.");
  }
  return minorUnitsFromBigInt(integer);
}

export function isCurrency(value: unknown): value is Currency {
  return (
    typeof value === "string" &&
    (SUPPORTED_CURRENCIES as readonly string[]).includes(value)
  );
}

export function assertCurrency(value: unknown): asserts value is Currency {
  if (!isCurrency(value)) {
    throw new Error("Currency must be one of the supported currencies: NGN or USD.");
  }
}

export function assertMinorUnitAmount(
  value: unknown,
): asserts value is number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > MAX_MINOR_UNIT_AMOUNT
  ) {
    throw new Error(
      `Money amount must be an integer from 0 to ${MAX_MINOR_UNIT_AMOUNT} minor units.`,
    );
  }
}

export function createMoney(amountMinor: number, currency: Currency): Money {
  assertMinorUnitAmount(amountMinor);
  assertCurrency(currency);
  return { amountMinor, currency };
}

/** Price boundary for future seller-created listings; no listing CRUD here. */
export function createSellerListingPrice(
  amountMinor: number,
): SellerListingPrice {
  assertMinorUnitAmount(amountMinor);
  return { amountMinor, currency: "USD" };
}

export function assertMoney(value: unknown): asserts value is Money {
  if (!value || typeof value !== "object") {
    throw new Error("Money must include an amount and currency.");
  }
  const money = value as Partial<Money>;
  assertMinorUnitAmount(money.amountMinor);
  assertCurrency(money.currency);
}

export function assertSameCurrency(...values: Money[]): Currency {
  if (values.length === 0) {
    throw new Error("At least one money value is required.");
  }
  for (const value of values) assertMoney(value);
  const currency = values[0].currency;
  if (values.some((value) => value.currency !== currency)) {
    throw new Error("Money values must use the same currency.");
  }
  return currency;
}

export function assertBookingMoneyConsistency(
  amount: Money,
  platformFee: Money,
  providerShare: Money,
): void {
  assertSameCurrency(amount, platformFee, providerShare);
  if (
    BigInt(platformFee.amountMinor) + BigInt(providerShare.amountMinor) !==
    BigInt(amount.amountMinor)
  ) {
    throw new Error("Platform fee and provider share must equal the booking amount.");
  }
}

export function assertPaymentAmountMatchesBooking(
  attemptAmount: Money,
  bookingAmount: Money,
): void {
  assertSameCurrency(attemptAmount, bookingAmount);
  if (attemptAmount.amountMinor !== bookingAmount.amountMinor) {
    throw new Error("Payment attempt amount must match its booking amount.");
  }
}

export function sumMoney(values: Money[], currency: Currency): Money {
  let total = BigInt(0);
  for (const value of values) {
    assertSameCurrency(value, { amountMinor: 0, currency });
    total += BigInt(value.amountMinor);
  }
  return createMoney(minorUnitsFromBigInt(total), currency);
}

/** Explicit compatibility boundary for the existing NGN/kobo-only schema. */
export function moneyFromLegacyNgnKobo(
  amountKobo: number,
  storedCurrency: unknown,
): Money {
  if (storedCurrency !== "NGN") {
    throw new Error("The current database schema supports NGN/kobo only.");
  }
  return createMoney(amountKobo, "NGN");
}

/** Explicit compatibility boundary; USD values must never enter kobo columns. */
export function moneyToLegacyNgnKobo(money: Money): number {
  assertMoney(money);
  if (money.currency !== "NGN") {
    throw new Error("The current database schema supports NGN/kobo only.");
  }
  return money.amountMinor;
}
