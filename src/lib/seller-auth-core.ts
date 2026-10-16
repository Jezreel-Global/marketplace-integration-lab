export class SellerAuthenticationError extends Error {
  constructor(
    readonly code: "configuration" | "unauthenticated",
    message: string,
  ) {
    super(message);
    this.name = "SellerAuthenticationError";
  }
}

export interface SellerSession {
  userId: string | null;
  isAuthenticated: boolean;
}

export type SellerSessionReader = () => Promise<SellerSession>;

export async function requireSellerIdentity(
  configured: boolean,
  readSession: SellerSessionReader,
): Promise<string> {
  if (!configured) {
    throw new SellerAuthenticationError(
      "configuration",
      "Seller sign-in is not configured on this deployment.",
    );
  }

  const session = await readSession();
  if (!session.isAuthenticated || !session.userId) {
    throw new SellerAuthenticationError(
      "unauthenticated",
      "Sign in to access your seller profile.",
    );
  }

  return session.userId;
}
