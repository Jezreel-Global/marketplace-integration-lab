import { auth } from "@clerk/nextjs/server";
import { hasClerkConfiguration } from "@/lib/auth-config";
import { requireSellerIdentity } from "@/lib/seller-auth-core";

export { SellerAuthenticationError, requireSellerIdentity } from "@/lib/seller-auth-core";

/** Clerk verifies this session on the server; email is never used as identity. */
export async function getAuthenticatedClerkUserId(): Promise<string> {
  return requireSellerIdentity(hasClerkConfiguration(), async () => {
    const session = await auth();
    return { userId: session.userId, isAuthenticated: session.isAuthenticated };
  });
}
