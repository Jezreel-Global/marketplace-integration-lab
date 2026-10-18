import type { Booking, PaymentAttemptRecord } from "@/types/marketplace";
import {
  assertBookingMoneyConsistency,
  assertCurrency,
  createMoney,
  createSellerListingPrice,
  parseMinorUnits,
} from "@/lib/money";
import type { SellerListing } from "@/types/marketplace";

type DbInteger = number | string | bigint;

export type BookingRow = {
  id: string;
  listing_id: string;
  seller_listing_id: string | null;
  provider_id: string;
  customer_name: string;
  customer_email: string;
  scheduled_for: Date | string;
  amount_minor: DbInteger;
  currency: string;
  platform_fee_minor: DbInteger;
  provider_share_minor: DbInteger;
  status: string;
  payment_mode: string;
  payment_attempt_status: string;
  data_source: string;
  created_at: Date | string;
  status_note: string;
};

export type PaymentAttemptRow = {
  id: string;
  booking_id: string;
  provider: string;
  mode: string;
  status: string;
  amount_minor: DbInteger;
  currency: string;
  data_source: string;
  note: string;
  created_at: Date | string;
};

function toIso(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid timestamp from store");
  }
  return date.toISOString();
}

export type SellerListingRow = {
  id: string;
  seller_profile_id: string;
  title: string;
  description: string;
  price_minor: DbInteger;
  currency: string;
  duration_minutes: number;
  availability_note: string;
  status: string;
  created_at: Date | string;
  updated_at: Date | string;
};

export function bookingFromRow(row: BookingRow): Booking {
  assertCurrency(row.currency);
  const booking: Booking = {
    id: row.id,
    listingId: row.listing_id,
    sellerListingId: row.seller_listing_id,
    providerId: row.provider_id,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    scheduledFor: toIso(row.scheduled_for),
    amount: createMoney(parseMinorUnits(row.amount_minor), row.currency),
    platformFee: createMoney(parseMinorUnits(row.platform_fee_minor), row.currency),
    providerShare: createMoney(parseMinorUnits(row.provider_share_minor), row.currency),
    status: row.status as Booking["status"],
    paymentMode: row.payment_mode as Booking["paymentMode"],
    paymentAttemptStatus:
      row.payment_attempt_status as Booking["paymentAttemptStatus"],
    dataSource: row.data_source as Booking["dataSource"],
    createdAt: toIso(row.created_at),
    statusNote: row.status_note,
  };
  assertBookingMoneyConsistency(
    booking.amount,
    booking.platformFee,
    booking.providerShare,
  );
  return booking;
}

export function paymentAttemptFromRow(
  row: PaymentAttemptRow,
): PaymentAttemptRecord {
  assertCurrency(row.currency);
  return {
    id: row.id,
    bookingId: row.booking_id,
    provider: row.provider as PaymentAttemptRecord["provider"],
    mode: row.mode as PaymentAttemptRecord["mode"],
    status: row.status as PaymentAttemptRecord["status"],
    amount: createMoney(parseMinorUnits(row.amount_minor), row.currency),
    dataSource: row.data_source as PaymentAttemptRecord["dataSource"],
    note: row.note,
    createdAt: toIso(row.created_at),
  };
}

export function sellerListingFromRow(row: SellerListingRow): SellerListing {
  if (row.currency !== "USD") {
    throw new Error("Persisted seller listings must use USD.");
  }
  const priceMinor = parseMinorUnits(row.price_minor);
  if (priceMinor <= 0) {
    throw new Error("Persisted seller listing price must be positive.");
  }
  if (!Number.isSafeInteger(row.duration_minutes) || row.duration_minutes < 1) {
    throw new Error("Invalid seller listing duration from store.");
  }
  if (!["draft", "published", "paused"].includes(row.status)) {
    throw new Error("Invalid seller listing status from store.");
  }
  return {
    id: row.id,
    sellerProfileId: row.seller_profile_id,
    title: row.title,
    description: row.description,
    price: createSellerListingPrice(priceMinor),
    durationMinutes: row.duration_minutes,
    availabilityNote: row.availability_note,
    status: row.status as SellerListing["status"],
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}
