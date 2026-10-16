"use server";

import { revalidatePath } from "next/cache";
import { hasClerkConfiguration } from "@/lib/auth-config";
import { getAuthenticatedClerkUserId } from "@/lib/seller-auth";
import {
  createOrGetSellerProfileFromForm,
  type SellerProfileActionState,
} from "@/lib/seller-profile-service";
import { getMarketplaceStore } from "@/lib/store";
import { sellerProfileActionErrorMessage } from "@/lib/seller-profile-errors";

export async function createSellerProfileAction(
  _previousState: SellerProfileActionState,
  formData: FormData,
): Promise<SellerProfileActionState> {
  try {
    const profile = await createOrGetSellerProfileFromForm({
      formData,
      clerkConfigured: hasClerkConfiguration(),
      readSession: async () => ({
        userId: await getAuthenticatedClerkUserId(),
        isAuthenticated: true,
      }),
      store: getMarketplaceStore(),
    });

    revalidatePath("/seller");
    return {
      status: "success",
      message: `Seller profile created for ${profile.displayName}.`,
    };
  } catch (error) {
    return {
      status: "error",
      message: sellerProfileActionErrorMessage(error),
    };
  }
}
