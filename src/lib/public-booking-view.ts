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
  | "amount"
  | "platformFee"
  | "providerShare"
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
    amount: booking.amount,
    platformFee: booking.platformFee,
    providerShare: booking.providerShare,
    status: booking.status,
    paymentMode: booking.paymentMode,
    paymentAttemptStatus: booking.paymentAttemptStatus,
    dataSource: booking.dataSource,
    createdAt: booking.createdAt,
    statusNote: booking.statusNote,
  };
}
