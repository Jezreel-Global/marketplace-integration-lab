import assert from "node:assert/strict";
import test from "node:test";
import {
  AdminAuthorizationError,
  parseAdminUserIdAllowlist,
  requireAdminIdentity,
} from "../src/lib/admin-auth-core";
import { runAdminMutation } from "../src/lib/admin-actions-core";
import { bookings as seedBookings } from "../src/data/seed";
import {
  canReadBookingDetails,
  toPublicBookingDisplay,
} from "../src/lib/public-booking-view";
import {
  createBooking,
  cancelRuntimeBooking,
  getBookingById,
  listAllPaymentAttempts,
  simulatePayment,
} from "../src/lib/marketplace-repository";
import {
  createMemoryStore,
  setMarketplaceStoreForTests,
} from "../src/lib/store";

const allowlist = "user_admin123";

test("admin authorization fails closed without Clerk or a valid allowlist", () => {
  assert.throws(
    () =>
      requireAdminIdentity({
        clerkConfigured: false,
        allowlist,
        userId: "user_admin123",
      }),
    (error: unknown) =>
      error instanceof AdminAuthorizationError && error.code === "configuration",
  );

  for (const value of [undefined, "", "user_admin123,", "user_admin123, not-a-user", "user_admin123,user_admin123"]) {
    assert.throws(
      () => parseAdminUserIdAllowlist(value),
      (error: unknown) =>
        error instanceof AdminAuthorizationError && error.code === "configuration",
    );
  }
});

test("signed-out and non-admin users are rejected; an allowlisted admin is accepted", () => {
  assert.throws(
    () =>
      requireAdminIdentity({ clerkConfigured: true, allowlist, userId: null }),
    (error: unknown) =>
      error instanceof AdminAuthorizationError && error.code === "unauthenticated",
  );

  assert.throws(
    () =>
      requireAdminIdentity({
        clerkConfigured: true,
        allowlist,
        userId: "user_regular123",
      }),
    (error: unknown) =>
      error instanceof AdminAuthorizationError && error.code === "forbidden",
  );

  assert.equal(
    requireAdminIdentity({ clerkConfigured: true, allowlist, userId: "user_admin123" }),
    "user_admin123",
  );
});

test("browser-supplied role, email, and user IDs cannot grant admin access", () => {
  const forgedBrowserData = {
    clerkConfigured: true,
    allowlist,
    userId: "user_regular123",
    role: "admin",
    email: "admin@example.invalid",
    requestedUserId: "user_admin123",
  };

  assert.throws(
    () => requireAdminIdentity(forgedBrowserData),
    AdminAuthorizationError,
  );
});

test("public booking detail access excludes runtime rows and redacts public seed details", () => {
  assert.equal(
    canReadBookingDetails({ isSeedBooking: false, isAdmin: false }),
    false,
  );
  assert.equal(
    canReadBookingDetails({ isSeedBooking: false, isAdmin: true }),
    true,
  );
  assert.equal(
    canReadBookingDetails({ isSeedBooking: true, isAdmin: false }),
    true,
  );

  const publicDisplay = toPublicBookingDisplay(seedBookings[0]);
  assert.equal("id" in publicDisplay, false);
  assert.equal("customerName" in publicDisplay, false);
  assert.equal("customerEmail" in publicDisplay, false);
});

test("a denied simulated-payment action makes no booking or attempt changes", async () => {
  const store = createMemoryStore();
  setMarketplaceStoreForTests(store);
  try {
    const created = await createBooking({
      listingId: "list_deep_clean",
      customerName: "Test Customer",
      customerEmail: "customer@example.invalid",
      scheduledFor: "2026-11-02T09:00",
    });
    assert.equal(created.ok, true);
    if (!created.ok) return;

    const bookingId = created.data.booking.id;
    const beforeBooking = await getBookingById(bookingId);
    const beforeAttempts = await listAllPaymentAttempts();
    const result = await runAdminMutation(
      async () =>
        requireAdminIdentity({
          clerkConfigured: true,
          allowlist,
          userId: "user_regular123",
        }),
      () => simulatePayment(bookingId, "success"),
    );

    assert.equal(result.ok, false);
    assert.deepEqual(await getBookingById(bookingId), beforeBooking);
    assert.deepEqual(await listAllPaymentAttempts(), beforeAttempts);
  } finally {
    setMarketplaceStoreForTests(undefined);
  }
});

test("a denied cancellation action makes no booking or attempt changes", async () => {
  const store = createMemoryStore();
  setMarketplaceStoreForTests(store);
  try {
    const created = await createBooking({
      listingId: "list_deep_clean",
      customerName: "Test Customer",
      customerEmail: "customer@example.invalid",
      scheduledFor: "2026-11-02T09:00",
    });
    assert.equal(created.ok, true);
    if (!created.ok) return;

    const bookingId = created.data.booking.id;
    const beforeBooking = await getBookingById(bookingId);
    const beforeAttempts = await listAllPaymentAttempts();
    const result = await runAdminMutation(
      async () =>
        requireAdminIdentity({
          clerkConfigured: true,
          allowlist,
          userId: "user_regular123",
        }),
      () => cancelRuntimeBooking(bookingId),
    );

    assert.equal(result.ok, false);
    assert.deepEqual(await getBookingById(bookingId), beforeBooking);
    assert.deepEqual(await listAllPaymentAttempts(), beforeAttempts);
  } finally {
    setMarketplaceStoreForTests(undefined);
  }
});
