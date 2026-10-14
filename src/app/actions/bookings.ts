"use server";

import { revalidatePath } from "next/cache";
import {
  cancelRuntimeBooking,
  createBooking,
  simulatePayment,
  type CreateBookingInput,
  type RepositoryResult,
} from "@/lib/marketplace-repository";
import type { Booking, PaymentAttemptRecord } from "@/types/marketplace";

function revalidateMarketplaceViews(bookingId?: string) {
  revalidatePath("/");
  revalidatePath("/provider");
  revalidatePath("/admin");
  revalidatePath("/listings", "layout");
  revalidatePath("/bookings", "layout");
  if (bookingId) {
    revalidatePath(`/bookings/${bookingId}`);
  }
}

export async function createBookingAction(
  input: CreateBookingInput,
): Promise<RepositoryResult<{ bookingId: string }>> {
  const result = await createBooking(input);
  if (!result.ok) return result;
  revalidateMarketplaceViews(result.data.booking.id);
  return { ok: true, data: { bookingId: result.data.booking.id } };
}

export async function simulatePaymentAction(
  bookingId: string,
  outcome: "success" | "failure",
): Promise<
  RepositoryResult<{ booking: Booking; attempt: PaymentAttemptRecord }>
> {
  const result = await simulatePayment(bookingId, outcome);
  if (!result.ok) return result;
  revalidateMarketplaceViews(result.data.booking.id);
  return result;
}

export async function cancelBookingAction(
  bookingId: string,
): Promise<RepositoryResult<{ booking: Booking }>> {
  const result = await cancelRuntimeBooking(bookingId);
  if (!result.ok) return result;
  revalidateMarketplaceViews(result.data.booking.id);
  return result;
}
