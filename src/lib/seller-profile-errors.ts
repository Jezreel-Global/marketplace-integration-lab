import {
  SellerAuthenticationError,
} from "@/lib/seller-auth-core";
import { StoreError, publicStoreErrorMessage } from "@/lib/store/types";

export class SellerProfileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SellerProfileValidationError";
  }
}

/** Return only messages intended for display; hide unexpected server errors. */
export function sellerProfileActionErrorMessage(error: unknown): string {
  if (
    error instanceof SellerAuthenticationError ||
    error instanceof SellerProfileValidationError
  ) {
    return error.message;
  }
  if (error instanceof StoreError) {
    return publicStoreErrorMessage(error);
  }
  return "Could not save the seller profile. Try again later.";
}
