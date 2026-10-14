import { randomUUID } from "node:crypto";
import {
  bookings as seedBookings,
  getListing,
  paymentAttempts as seedPaymentAttempts,
} from "@/data/seed";
import { calculatePlatformFee } from "@/lib/fees";
import {
  getMarketplaceStore,
  publicStoreErrorMessage,
  StoreError,
} from "@/lib/store";
import type {
  Booking,
  PaymentAttemptRecord,
  PaymentAttemptStatus,
} from "@/types/marketplace";

export type RepositoryResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type CreateBookingInput = {
  listingId: string;
  customerName: string;
  customerEmail: string;
  scheduledFor: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function newBookingId() {
  return `book_rt_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

function newPaymentId() {
  return `pay_rt_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

function normalizeScheduledFor(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function validateCreateInput(
  input: CreateBookingInput,
): RepositoryResult<{
  listingId: string;
  name: string;
  email: string;
  when: string;
}> {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Enter valid booking details." };
  }

  const listingId =
    typeof input.listingId === "string" ? input.listingId.trim() : "";
  const listing = getListing(listingId);
  if (!listing) {
    return {
      ok: false,
      error: "Unknown listing. Choose a service from the marketplace.",
    };
  }

  const name =
    typeof input.customerName === "string" ? input.customerName.trim() : "";
  if (name.length < 2 || name.length > 120) {
    return {
      ok: false,
      error: "Enter a customer name between 2 and 120 characters.",
    };
  }

  const email =
    typeof input.customerEmail === "string"
      ? input.customerEmail.trim().toLowerCase()
      : "";
  if (!EMAIL_RE.test(email) || email.length > 200) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const when =
    typeof input.scheduledFor === "string"
      ? normalizeScheduledFor(input.scheduledFor)
      : null;
  if (!when) {
    return { ok: false, error: "Enter a valid preferred date and time." };
  }

  return {
    ok: true,
    data: { listingId: listing.id, name, email, when },
  };
}

function isSeedBookingId(id: string) {
  return seedBookings.some((b) => b.id === id);
}

function fail(error: unknown): RepositoryResult<never> {
  return { ok: false, error: publicStoreErrorMessage(error) };
}

/** Merged bookings: immutable seed first, then runtime Postgres rows. */
export async function listAllBookings(): Promise<Booking[]> {
  try {
    const runtime = await getMarketplaceStore().listBookings();
    return [...seedBookings, ...runtime];
  } catch {
    console.error("[listAllBookings] Runtime database read failed");
    throw new StoreError(
      "Runtime demo bookings are temporarily unavailable. Please try again.",
      "internal",
    );
  }
}

export async function listAllPaymentAttempts(): Promise<PaymentAttemptRecord[]> {
  try {
    const runtime = await getMarketplaceStore().listPaymentAttempts();
    return [...seedPaymentAttempts, ...runtime];
  } catch {
    console.error("[listAllPaymentAttempts] Runtime database read failed");
    throw new StoreError(
      "Runtime demo payment attempts are temporarily unavailable. Please try again.",
      "internal",
    );
  }
}

export async function getBookingById(id: string): Promise<Booking | undefined> {
  const seed = seedBookings.find((b) => b.id === id);
  if (seed) return seed;
  try {
    return await getMarketplaceStore().getBookingById(id);
  } catch {
    console.error("[getBookingById] Runtime database read failed");
    throw new StoreError(
      "Runtime demo booking details are temporarily unavailable. Please try again.",
      "internal",
    );
  }
}

export async function listBookingsForProvider(
  providerId: string,
): Promise<Booking[]> {
  const all = await listAllBookings();
  return all.filter((b) => b.providerId === providerId);
}

export async function listPaymentAttemptsForBooking(
  bookingId: string,
): Promise<PaymentAttemptRecord[]> {
  const all = await listAllPaymentAttempts();
  return all.filter((a) => a.bookingId === bookingId);
}

export async function createBooking(
  input: CreateBookingInput,
): Promise<RepositoryResult<{ booking: Booking }>> {
  const validated = validateCreateInput(input);
  if (!validated.ok) return validated;

  const listing = getListing(validated.data.listingId);
  if (!listing) {
    return { ok: false, error: "Unknown listing." };
  }

  const fees = calculatePlatformFee(listing.priceKobo);
  const now = new Date().toISOString();
  const booking: Booking = {
    id: newBookingId(),
    listingId: listing.id,
    providerId: listing.providerId,
    customerName: validated.data.name,
    customerEmail: validated.data.email,
    scheduledFor: validated.data.when,
    amountKobo: fees.amountKobo,
    currency: "NGN",
    platformFeeKobo: fees.platformFeeKobo,
    providerShareKobo: fees.providerShareKobo,
    status: "pending_payment",
    paymentMode: "simulated",
    paymentAttemptStatus: "not_started",
    dataSource: "mock",
    createdAt: now,
    statusNote:
      "Runtime demo booking awaiting a labelled simulated payment. No real money will move.",
  };

  try {
    const created = await getMarketplaceStore().insertBooking(booking);
    return { ok: true, data: { booking: created } };
  } catch (error) {
    return fail(error);
  }
}

export async function simulatePayment(
  bookingId: string,
  outcome: "success" | "failure",
): Promise<
  RepositoryResult<{ booking: Booking; attempt: PaymentAttemptRecord }>
> {
  const id = typeof bookingId === "string" ? bookingId.trim() : "";
  if (!id) return { ok: false, error: "Missing booking id." };
  if (outcome !== "success" && outcome !== "failure") {
    return { ok: false, error: "Choose a valid simulated payment outcome." };
  }

  if (isSeedBookingId(id)) {
    return {
      ok: false,
      error:
        "Seed bookings are read-only illustrations. Create a new booking from a listing to run a simulated payment.",
    };
  }

  try {
    const result = await getMarketplaceStore().updateBooking(id, (booking) => {
      if (booking.dataSource !== "mock") {
        throw new StoreError("Only mock runtime bookings can be simulated.");
      }
      if (booking.status === "cancelled") {
        throw new StoreError("This booking is cancelled and cannot be paid.");
      }
      if (booking.status === "paid") {
        throw new StoreError(
          "This booking is already marked paid (simulated).",
        );
      }
      if (
        booking.status !== "pending_payment" &&
        booking.status !== "payment_failed"
      ) {
        throw new StoreError(
          `Cannot simulate payment from status “${booking.status}”.`,
        );
      }

      const now = new Date().toISOString();
      const attemptStatus: PaymentAttemptStatus =
        outcome === "success" ? "succeeded" : "failed";
      const attempt: PaymentAttemptRecord = {
        id: newPaymentId(),
        bookingId: booking.id,
        provider: "mock",
        mode: "simulated",
        status: attemptStatus,
        amountKobo: booking.amountKobo,
        currency: "NGN",
        dataSource: "mock",
        note:
          outcome === "success"
            ? "Labelled simulated success in Neon Postgres. No Stripe/Paystack call; no real money moved."
            : "Labelled simulated failure in Neon Postgres. No provider was contacted.",
        createdAt: now,
      };

      const updated: Booking = {
        ...booking,
        paymentMode: "simulated",
        paymentAttemptStatus: attemptStatus,
        status: outcome === "success" ? "paid" : "payment_failed",
        statusNote:
          outcome === "success"
            ? "Simulated payment succeeded in the demo database. This is not a provider-confirmed transaction and no real money moved."
            : "Simulated payment failed in the demo database. You can retry the simulation; no real money moved.",
      };

      return { booking: updated, attempt };
    });

    if (!result.attempt) {
      return {
        ok: false,
        error: "Payment attempt was not recorded.",
      };
    }

    return {
      ok: true,
      data: { booking: result.booking, attempt: result.attempt },
    };
  } catch (error) {
    return fail(error);
  }
}

export async function cancelRuntimeBooking(
  bookingId: string,
): Promise<RepositoryResult<{ booking: Booking }>> {
  const id = typeof bookingId === "string" ? bookingId.trim() : "";
  if (!id) return { ok: false, error: "Missing booking id." };

  if (isSeedBookingId(id)) {
    return {
      ok: false,
      error:
        "Seed bookings are read-only and cannot be cancelled from the demo UI.",
    };
  }

  try {
    const { booking } = await getMarketplaceStore().updateBooking(
      id,
      (existing) => {
        if (existing.status === "cancelled") {
          throw new StoreError("This booking is already cancelled.");
        }
        if (existing.status === "paid") {
          throw new StoreError(
            "Paid simulated bookings cannot be cancelled in this demo. Use the documented demo reset procedure.",
          );
        }
        if (
          existing.status !== "pending_payment" &&
          existing.status !== "payment_failed"
        ) {
          throw new StoreError(
            `Cannot cancel a booking in status “${existing.status}”.`,
          );
        }

        const updated: Booking = {
          ...existing,
          status: "cancelled",
          paymentAttemptStatus: "cancelled",
          statusNote:
            "Customer cancelled before a successful simulated payment. Seed catalog unchanged; runtime row only.",
        };

        return { booking: updated };
      },
    );

    return { ok: true, data: { booking } };
  } catch (error) {
    return fail(error);
  }
}
