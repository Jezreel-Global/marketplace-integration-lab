import type { Booking } from "@/types/marketplace";

export function canReadBookingDetails(input: {
  isSeedBooking: boolean;
  isAdmin: boolean;
}): boolean {
  return input.isSeedBooking || input.isAdmin;
}

export type PublicBookingDisplay = Pick<
  Booking,
  | "listingId"
  | "providerId"
  | "scheduledFor"
  | "amountKobo"
  | "currency"
  | "platformFeeKobo"
  | "providerShareKobo"
  | "status"
  | "paymentMode"
  | "paymentAttemptStatus"
  | "dataSource"
  | "createdAt"
  | "statusNote"
>;

/** Public seed details are fictional and omit customer identity and booking IDs. */
export function toPublicBookingDisplay(booking: Booking): PublicBookingDisplay {
  return {
    listingId: booking.listingId,
    providerId: booking.providerId,
    scheduledFor: booking.scheduledFor,
    amountKobo: booking.amountKobo,
    currency: booking.currency,
    platformFeeKobo: booking.platformFeeKobo,
    providerShareKobo: booking.providerShareKobo,
    status: booking.status,
    paymentMode: booking.paymentMode,
    paymentAttemptStatus: booking.paymentAttemptStatus,
    dataSource: booking.dataSource,
    createdAt: booking.createdAt,
    statusNote: booking.statusNote,
  };
}
