import type { Booking, PaymentAttemptRecord, SellerProfile } from "@/types/marketplace";
import { createProcessLock } from "@/lib/store/process-lock";
import { StoreError, type MarketplaceStore } from "@/lib/store/types";

/** In-process store for unit tests without PostgreSQL. */
export function createMemoryStore(
  seed: {
    bookings?: Booking[];
    paymentAttempts?: PaymentAttemptRecord[];
    sellerProfiles?: SellerProfile[];
  } = {},
): MarketplaceStore {
  const withLock = createProcessLock();
  let bookings = [...(seed.bookings ?? [])];
  let paymentAttempts = [...(seed.paymentAttempts ?? [])];
  let sellerProfiles = [...(seed.sellerProfiles ?? [])];

  return {
    listBookings() {
      return withLock(async () => [...bookings]);
    },
    listPaymentAttempts() {
      return withLock(async () => [...paymentAttempts]);
    },
    getBookingById(id) {
      return withLock(async () => bookings.find((b) => b.id === id));
    },
    insertBooking(booking) {
      return withLock(async () => {
        if (bookings.some((b) => b.id === booking.id)) {
          throw new StoreError("Booking ID collision; retry.", "conflict");
        }
        bookings = [...bookings, booking];
        return booking;
      });
    },
    updateBooking(bookingId, mutator) {
      return withLock(async () => {
        const index = bookings.findIndex((b) => b.id === bookingId);
        if (index < 0) {
          throw new StoreError("Booking not found in the demo store.", "not_found");
        }
        const { booking, attempt } = mutator(bookings[index]);
        const next = [...bookings];
        next[index] = booking;
        bookings = next;
        if (attempt) {
          paymentAttempts = [...paymentAttempts, attempt];
        }
        return { booking, attempt };
      });
    },
    getSellerProfileByClerkUserId(clerkUserId) {
      return withLock(async () =>
        sellerProfiles.find((profile) => profile.clerkUserId === clerkUserId),
      );
    },
    insertSellerProfile(profile) {
      return withLock(async () => {
        if (
          sellerProfiles.some(
            (existing) =>
              existing.id === profile.id ||
              existing.clerkUserId === profile.clerkUserId,
          )
        ) {
          throw new StoreError(
            "Seller identity is already registered.",
            "conflict",
          );
        }
        sellerProfiles = [...sellerProfiles, profile];
        return profile;
      });
    },
  };
}
