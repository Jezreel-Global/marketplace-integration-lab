import type { Booking, PaymentAttemptRecord, SellerListing, SellerProfile } from "@/types/marketplace";
import { createProcessLock } from "@/lib/store/process-lock";
import { StoreError, type MarketplaceStore } from "@/lib/store/types";
import {
  assertBookingMoneyConsistency,
  assertPaymentAmountMatchesBooking,
} from "@/lib/money";

/** In-process store for unit tests without PostgreSQL. */
export function createMemoryStore(
  seed: {
    bookings?: Booking[];
    paymentAttempts?: PaymentAttemptRecord[];
    sellerProfiles?: SellerProfile[];
    sellerListings?: SellerListing[];
  } = {},
): MarketplaceStore {
  const withLock = createProcessLock();
  let bookings = [...(seed.bookings ?? [])];
  let paymentAttempts = [...(seed.paymentAttempts ?? [])];
  let sellerProfiles = [...(seed.sellerProfiles ?? [])];
  let sellerListings = [...(seed.sellerListings ?? [])];

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
        assertBookingMoneyConsistency(
          booking.amount,
          booking.platformFee,
          booking.providerShare,
        );
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
        assertBookingMoneyConsistency(
          booking.amount,
          booking.platformFee,
          booking.providerShare,
        );
        if (attempt) {
          if (attempt.bookingId !== bookingId) {
            throw new StoreError("Payment attempt booking mismatch.", "conflict");
          }
          assertPaymentAmountMatchesBooking(attempt.amount, booking.amount);
        }
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
    listSellerListingsForClerkUserId(clerkUserId) {
      return withLock(async () => {
        const profile = sellerProfiles.find((item) => item.clerkUserId === clerkUserId);
        return profile
          ? sellerListings.filter((listing) => listing.sellerProfileId === profile.id)
          : [];
      });
    },
    listPublishedSellerListings() {
      return withLock(async () => sellerListings.filter((listing) => listing.status === "published"));
    },
    getPublishedSellerListingById(id) {
      return withLock(async () => sellerListings.find((listing) => listing.id === id && listing.status === "published"));
    },
    insertSellerListingForClerkUserId(clerkUserId, listing) {
      return withLock(async () => {
        const profile = sellerProfiles.find((item) => item.clerkUserId === clerkUserId);
        if (!profile) throw new StoreError("Seller profile not found.", "not_found");
        if (listing.price.currency !== "USD" || !Number.isSafeInteger(listing.price.amountMinor) || listing.price.amountMinor <= 0) {
          throw new StoreError("Seller listings must have a valid positive USD price.");
        }
        if (sellerListings.some((item) => item.id === listing.id)) {
          throw new StoreError("Seller listing ID collision; retry.", "conflict");
        }
        const owned = { ...listing, sellerProfileId: profile.id };
        sellerListings = [...sellerListings, owned];
        return owned;
      });
    },
  };
}
