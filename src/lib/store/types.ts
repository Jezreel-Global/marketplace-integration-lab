import type { Booking, PaymentAttemptRecord } from "@/types/marketplace";

/**
 * Persistence port for runtime marketplace data.
 * Seed catalog stays outside this store. Swap adapters (memory → Postgres)
 * without changing booking/payment business rules in the repository.
 */
export interface MarketplaceStore {
  listBookings(): Promise<Booking[]>;
  listPaymentAttempts(): Promise<PaymentAttemptRecord[]>;
  getBookingById(id: string): Promise<Booking | undefined>;

  /** Insert a new runtime booking. Rejects duplicate IDs. */
  insertBooking(booking: Booking): Promise<Booking>;

  /**
   * Row-locked read-modify-write for one booking.
   * Optionally insert a payment attempt in the same transaction.
   */
  updateBooking(
    bookingId: string,
    mutator: (current: Booking) => {
      booking: Booking;
      attempt?: PaymentAttemptRecord;
    },
  ): Promise<{ booking: Booking; attempt?: PaymentAttemptRecord }>;
}

export class StoreError extends Error {
  readonly code: "config" | "not_found" | "conflict" | "internal";

  constructor(
    message: string,
    code: "config" | "not_found" | "conflict" | "internal" = "internal",
  ) {
    super(message);
    this.name = "StoreError";
    this.code = code;
  }
}

/** Safe visitor-facing message; never include SQL or connection details. */
export function publicStoreErrorMessage(error: unknown): string {
  if (error instanceof StoreError) {
    if (error.code === "config") {
      return "The demo database is not configured. Booking changes are unavailable.";
    }
    return error.message;
  }
  return "Something went wrong saving demo data. Please try again.";
}
