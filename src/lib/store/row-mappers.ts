import type { Booking, PaymentAttemptRecord } from "@/types/marketplace";

export type BookingRow = {
  id: string;
  listing_id: string;
  provider_id: string;
  customer_name: string;
  customer_email: string;
  scheduled_for: Date | string;
  amount_kobo: number;
  currency: string;
  platform_fee_kobo: number;
  provider_share_kobo: number;
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
  amount_kobo: number;
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

export function bookingFromRow(row: BookingRow): Booking {
  return {
    id: row.id,
    listingId: row.listing_id,
    providerId: row.provider_id,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    scheduledFor: toIso(row.scheduled_for),
    amountKobo: row.amount_kobo,
    currency: "NGN",
    platformFeeKobo: row.platform_fee_kobo,
    providerShareKobo: row.provider_share_kobo,
    status: row.status as Booking["status"],
    paymentMode: row.payment_mode as Booking["paymentMode"],
    paymentAttemptStatus:
      row.payment_attempt_status as Booking["paymentAttemptStatus"],
    dataSource: row.data_source as Booking["dataSource"],
    createdAt: toIso(row.created_at),
    statusNote: row.status_note,
  };
}

export function paymentAttemptFromRow(
  row: PaymentAttemptRow,
): PaymentAttemptRecord {
  return {
    id: row.id,
    bookingId: row.booking_id,
    provider: row.provider as PaymentAttemptRecord["provider"],
    mode: row.mode as PaymentAttemptRecord["mode"],
    status: row.status as PaymentAttemptRecord["status"],
    amountKobo: row.amount_kobo,
    currency: "NGN",
    dataSource: row.data_source as PaymentAttemptRecord["dataSource"],
    note: row.note,
    createdAt: toIso(row.created_at),
  };
}
