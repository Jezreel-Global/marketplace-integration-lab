export type AdminAuthorizationFailure =
  | "configuration"
  | "unauthenticated"
  | "forbidden";

export class AdminAuthorizationError extends Error {
  constructor(readonly code: AdminAuthorizationFailure) {
    const message =
      code === "configuration"
        ? "Admin access is not configured."
        : code === "unauthenticated"
          ? "Sign in with an authorized administrator account."
          : "You are not authorized to access this page.";
    super(message);
    this.name = "AdminAuthorizationError";
  }
}

const CLERK_USER_ID = /^user_[A-Za-z0-9_-]+$/;

export function parseAdminUserIdAllowlist(raw: string | undefined): Set<string> {
  if (!raw?.trim()) {
    throw new AdminAuthorizationError("configuration");
  }

  const entries = raw.split(",").map((entry) => entry.trim());
  if (
    entries.some((entry) => !CLERK_USER_ID.test(entry)) ||
    new Set(entries).size !== entries.length
  ) {
    throw new AdminAuthorizationError("configuration");
  }

  return new Set(entries);
}

/** Authorization uses only the verified Clerk user ID and server allowlist. */
export function requireAdminIdentity(input: {
  clerkConfigured: boolean;
  allowlist: string | undefined;
  userId: string | null;
}): string {
  if (!input.clerkConfigured) {
    throw new AdminAuthorizationError("configuration");
  }

  const allowedUserIds = parseAdminUserIdAllowlist(input.allowlist);
  if (!input.userId) {
    throw new AdminAuthorizationError("unauthenticated");
  }
  if (!allowedUserIds.has(input.userId)) {
    throw new AdminAuthorizationError("forbidden");
  }

  return input.userId;
}
