import assert from "node:assert/strict";
import test from "node:test";
import { createMemoryStore } from "../src/lib/store/memory-adapter";
import { createOrGetSellerProfileFromForm } from "../src/lib/seller-profile-service";
import {
  requireSellerIdentity,
  SellerAuthenticationError,
} from "../src/lib/seller-auth-core";
import {
  SellerProfileValidationError,
  sellerProfileActionErrorMessage,
} from "../src/lib/seller-profile-errors";
import { StoreError } from "../src/lib/store/types";

function form(values: Record<string, string>) {
  const result = new FormData();
  for (const [key, value] of Object.entries(values)) result.set(key, value);
  return result;
}

test("unauthenticated and expired sessions cannot create seller profiles", async () => {
  const store = createMemoryStore();
  for (const session of [
    { userId: null, isAuthenticated: false },
    { userId: null, isAuthenticated: true },
  ]) {
    await assert.rejects(
      createOrGetSellerProfileFromForm({
        formData: form({ displayName: "No Access" }),
        clerkConfigured: true,
        readSession: async () => session,
        store,
      }),
      SellerAuthenticationError,
    );
  }
  assert.equal(await store.getSellerProfileByClerkUserId("unknown"), undefined);
});

test("missing Clerk configuration fails closed without reading a session", async () => {
  let readerCalled = false;
  await assert.rejects(
    requireSellerIdentity(false, async () => {
      readerCalled = true;
      return { userId: "should-not-be-used", isAuthenticated: true };
    }),
    (error: unknown) =>
      error instanceof SellerAuthenticationError &&
      error.code === "configuration",
  );
  assert.equal(readerCalled, false);
});

test("authenticated sellers receive profiles scoped to their own session", async () => {
  const store = createMemoryStore();
  const own = await createOrGetSellerProfileFromForm({
    formData: form({ displayName: "Seller One" }),
    clerkConfigured: true,
    readSession: async () => ({ userId: "user_one", isAuthenticated: true }),
    store,
  });
  const other = await createOrGetSellerProfileFromForm({
    formData: form({ displayName: "Seller Two" }),
    clerkConfigured: true,
    readSession: async () => ({ userId: "user_two", isAuthenticated: true }),
    store,
  });

  assert.equal((await store.getSellerProfileByClerkUserId("user_one"))?.id, own.id);
  assert.equal((await store.getSellerProfileByClerkUserId("user_two"))?.id, other.id);
  assert.notEqual(own.clerkUserId, other.clerkUserId);
});

test("forged IDs, roles, and emails cannot access another seller profile", async () => {
  const store = createMemoryStore();
  const victim = await createOrGetSellerProfileFromForm({
    formData: form({ displayName: "Victim Seller" }),
    clerkConfigured: true,
    readSession: async () => ({ userId: "victim_user", isAuthenticated: true }),
    store,
  });
  const attackerAttempt = await createOrGetSellerProfileFromForm({
    formData: form({
      displayName: "Attacker",
      clerkUserId: "victim_user",
      userId: "victim_user",
      sellerId: victim.id,
      email: "unverified@example.invalid",
      role: "admin",
    }),
    clerkConfigured: true,
    readSession: async () => ({ userId: "authenticated_seller", isAuthenticated: true }),
    store,
  });

  assert.equal(attackerAttempt.clerkUserId, "authenticated_seller");
  assert.notEqual(attackerAttempt.id, victim.id);
  assert.equal((await store.getSellerProfileByClerkUserId("victim_user"))?.id, victim.id);
  assert.equal("email" in attackerAttempt, false);
});

test("one unique seller profile mapping is retained for each Clerk user", async () => {
  const store = createMemoryStore();
  const first = await createOrGetSellerProfileFromForm({
    formData: form({ displayName: "First Name" }),
    clerkConfigured: true,
    readSession: async () => ({ userId: "clerk_user", isAuthenticated: true }),
    store,
  });
  const second = await createOrGetSellerProfileFromForm({
    formData: form({ displayName: "Changed Name" }),
    clerkConfigured: true,
    readSession: async () => ({ userId: "clerk_user", isAuthenticated: true }),
    store,
  });

  assert.equal(second.id, first.id);
  assert.equal(second.displayName, "First Name");
});

test("invalid profile names are rejected before persistence", async () => {
  await assert.rejects(
    createOrGetSellerProfileFromForm({
      formData: form({ displayName: " " }),
      clerkConfigured: true,
      readSession: async () => ({ userId: "clerk_user", isAuthenticated: true }),
      store: createMemoryStore(),
    }),
    (error: unknown) =>
      error instanceof SellerProfileValidationError &&
      /between 2 and 80 characters/.test(error.message),
  );
});

test("seller action exposes only known safe errors", () => {
  assert.equal(
    sellerProfileActionErrorMessage(new Error("secret or SQL diagnostic")),
    "Could not save the seller profile. Try again later.",
  );
  assert.equal(
    sellerProfileActionErrorMessage(
      new SellerAuthenticationError("unauthenticated", "Sign in to continue."),
    ),
    "Sign in to continue.",
  );
  assert.equal(
    sellerProfileActionErrorMessage(
      new SellerProfileValidationError("Use a valid display name."),
    ),
    "Use a valid display name.",
  );
  assert.equal(
    sellerProfileActionErrorMessage(new StoreError("internal details", "config")),
    "The demo database is not configured. Booking changes are unavailable.",
  );
});
