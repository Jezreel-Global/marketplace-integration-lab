import {
  Pool,
  type PoolClient,
  type QueryResultRow,
} from "@neondatabase/serverless";
import type {
  Booking,
  PaymentAttemptRecord,
  SellerProfile,
} from "@/types/marketplace";
import {
  bookingFromRow,
  paymentAttemptFromRow,
  type BookingRow,
  type PaymentAttemptRow,
  sellerListingFromRow,
  type SellerListingRow,
} from "@/lib/store/row-mappers";
import { StoreError, type MarketplaceStore } from "@/lib/store/types";
import {
  assertBookingMoneyConsistency,
  assertPaymentAmountMatchesBooking,
  moneyToLegacyNgnKobo,
} from "@/lib/money";

function legacyKoboOrNull(money: Booking["amount"]): number | null {
  return money.currency === "NGN" ? moneyToLegacyNgnKobo(money) : null;
}

type Queryable = {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<{ rows: T[] }>;
};

type SellerProfileRow = QueryResultRow & {
  id: string;
  clerk_user_id: string;
  display_name: string;
  created_at: Date | string;
};

function sellerProfileFromRow(row: SellerProfileRow): SellerProfile {
  return {
    id: row.id,
    clerkUserId: row.clerk_user_id,
    displayName: row.display_name,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

function mapDbError(error: unknown, fallback: string): StoreError {
  if (error instanceof StoreError) return error;
  const err = error as { code?: string; message?: string };
  if (err.code === "23505") {
    return new StoreError("Booking ID collision; retry.", "conflict");
  }
  console.error("[marketplace-store] Database operation failed (" + (err.code ?? "unknown") + ")");
  return new StoreError(fallback, "internal");
}

async function listBookingsQuery(db: Queryable): Promise<Booking[]> {
  const result = await db.query<BookingRow>(
    `SELECT *
     FROM runtime_bookings
     ORDER BY created_at ASC`,
  );
  return result.rows.map(bookingFromRow);
}

async function listPaymentAttemptsQuery(
  db: Queryable,
): Promise<PaymentAttemptRecord[]> {
  const result = await db.query<PaymentAttemptRow>(
    `SELECT *
     FROM runtime_payment_attempts
     ORDER BY created_at ASC`,
  );
  return result.rows.map(paymentAttemptFromRow);
}

async function insertBookingQuery(
  db: Queryable,
  booking: Booking,
): Promise<Booking> {
  assertBookingMoneyConsistency(
    booking.amount,
    booking.platformFee,
    booking.providerShare,
  );
  const result = await db.query<BookingRow>(
    `INSERT INTO runtime_bookings (
      id, listing_id, seller_listing_id, provider_id, customer_name, customer_email,
      scheduled_for, amount_minor, amount_kobo, currency,
      platform_fee_minor, platform_fee_kobo, provider_share_minor, provider_share_kobo,
      status, payment_mode, payment_attempt_status, data_source, created_at, status_note
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7::timestamptz,
      $8, $9, $10, $11, $12, $13, $14,
      $15, $16, $17, $18, $19::timestamptz, $20
    )
    RETURNING *`,
    [
      booking.id,
      booking.listingId,
      booking.sellerListingId ?? null,
      booking.providerId,
      booking.customerName,
      booking.customerEmail,
      booking.scheduledFor,
      booking.amount.amountMinor,
      legacyKoboOrNull(booking.amount),
      booking.amount.currency,
      booking.platformFee.amountMinor,
      legacyKoboOrNull(booking.platformFee),
      booking.providerShare.amountMinor,
      legacyKoboOrNull(booking.providerShare),
      booking.status,
      booking.paymentMode,
      booking.paymentAttemptStatus,
      booking.dataSource,
      booking.createdAt,
      booking.statusNote,
    ],
  );
  return bookingFromRow(result.rows[0]);
}

async function insertAttemptQuery(
  db: Queryable,
  attempt: PaymentAttemptRecord,
): Promise<PaymentAttemptRecord> {
  const result = await db.query<PaymentAttemptRow>(
    `INSERT INTO runtime_payment_attempts (
      id, booking_id, provider, mode, status,
      amount_minor, amount_kobo, currency, data_source, note, created_at
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10, $11::timestamptz
    )
    RETURNING *`,
    [
      attempt.id,
      attempt.bookingId,
      attempt.provider,
      attempt.mode,
      attempt.status,
      attempt.amount.amountMinor,
      legacyKoboOrNull(attempt.amount),
      attempt.amount.currency,
      attempt.dataSource,
      attempt.note,
      attempt.createdAt,
    ],
  );
  return paymentAttemptFromRow(result.rows[0]);
}

async function updateBookingRowQuery(
  db: Queryable,
  booking: Booking,
): Promise<Booking> {
  assertBookingMoneyConsistency(
    booking.amount,
    booking.platformFee,
    booking.providerShare,
  );
  const result = await db.query<BookingRow>(
    `UPDATE runtime_bookings SET
      listing_id = $3,
      seller_listing_id = $2,
      provider_id = $4,
      customer_name = $5,
      customer_email = $6,
      scheduled_for = $7::timestamptz,
      amount_minor = $8,
      amount_kobo = $9,
      currency = $10,
      platform_fee_minor = $11,
      platform_fee_kobo = $12,
      provider_share_minor = $13,
      provider_share_kobo = $14,
      status = $15,
      payment_mode = $16,
      payment_attempt_status = $17,
      data_source = $18,
      status_note = $19,
      updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [
      booking.id,
      booking.sellerListingId ?? null,
      booking.listingId,
      booking.providerId,
      booking.customerName,
      booking.customerEmail,
      booking.scheduledFor,
      booking.amount.amountMinor,
      legacyKoboOrNull(booking.amount),
      booking.amount.currency,
      booking.platformFee.amountMinor,
      legacyKoboOrNull(booking.platformFee),
      booking.providerShare.amountMinor,
      legacyKoboOrNull(booking.providerShare),
      booking.status,
      booking.paymentMode,
      booking.paymentAttemptStatus,
      booking.dataSource,
      booking.statusNote,
    ],
  );
  if (!result.rows[0]) {
    throw new StoreError("Booking not found in the demo store.", "not_found");
  }
  return bookingFromRow(result.rows[0]);
}

async function withTransaction<T>(
  pool: Pool,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT set_config('marketplace.currency_aware_money_write', 'true', true)",
    );
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // ignore rollback errors
    }
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Neon / Vercel Postgres adapter using parameterized queries.
 * Requires DATABASE_URL (never expose via NEXT_PUBLIC_*).
 */
export function createPostgresStore(pool: Pool): MarketplaceStore {
  return {
    async listBookings() {
      try {
        return await listBookingsQuery(pool);
      } catch (error) {
        throw mapDbError(error, "Could not load bookings from the demo database.");
      }
    },

    async listPaymentAttempts() {
      try {
        return await listPaymentAttemptsQuery(pool);
      } catch (error) {
        throw mapDbError(
          error,
          "Could not load payment attempts from the demo database.",
        );
      }
    },

    async getBookingById(id) {
      try {
        const result = await pool.query<BookingRow>(
          `SELECT * FROM runtime_bookings WHERE id = $1 LIMIT 1`,
          [id],
        );
        return result.rows[0] ? bookingFromRow(result.rows[0]) : undefined;
      } catch (error) {
        throw mapDbError(error, "Could not load booking from the demo database.");
      }
    },

    async insertBooking(booking) {
      try {
        return await withTransaction(pool, (client) =>
          insertBookingQuery(client, booking),
        );
      } catch (error) {
        throw mapDbError(error, "Could not save booking to the demo database.");
      }
    },

    async updateBooking(bookingId, mutator) {
      try {
        return await withTransaction(pool, async (client) => {
          const locked = await client.query<BookingRow>(
            `SELECT * FROM runtime_bookings WHERE id = $1 FOR UPDATE`,
            [bookingId],
          );
          if (!locked.rows[0]) {
            throw new StoreError(
              "Booking not found in the demo store.",
              "not_found",
            );
          }
          const current = bookingFromRow(locked.rows[0]);
          const { booking, attempt } = mutator(current);
          if (booking.id !== bookingId) {
            throw new StoreError("Booking id mismatch.", "conflict");
          }
          const updated = await updateBookingRowQuery(client, booking);
          let savedAttempt: PaymentAttemptRecord | undefined;
          if (attempt) {
            if (attempt.bookingId !== bookingId) {
              throw new StoreError(
                "Payment attempt booking mismatch.",
                "conflict",
              );
            }
            assertPaymentAmountMatchesBooking(attempt.amount, booking.amount);
            savedAttempt = await insertAttemptQuery(client, attempt);
          }
          return { booking: updated, attempt: savedAttempt };
        });
      } catch (error) {
        throw mapDbError(error, "Could not update booking in the demo database.");
      }
    },
    async getSellerProfileByClerkUserId(clerkUserId) {
      try {
        const result = await pool.query<SellerProfileRow>(
          `SELECT id, clerk_user_id, display_name, created_at
           FROM seller_profiles
           WHERE clerk_user_id = $1
           LIMIT 1`,
          [clerkUserId],
        );
        return result.rows[0]
          ? sellerProfileFromRow(result.rows[0])
          : undefined;
      } catch (error) {
        throw mapDbError(error, "Could not load the seller profile.");
      }
    },
    async insertSellerProfile(profile) {
      try {
        const result = await pool.query<SellerProfileRow>(
          `INSERT INTO seller_profiles (
            id, clerk_user_id, display_name, created_at
          ) VALUES ($1, $2, $3, $4::timestamptz)
          RETURNING id, clerk_user_id, display_name, created_at`,
          [profile.id, profile.clerkUserId, profile.displayName, profile.createdAt],
        );
        return sellerProfileFromRow(result.rows[0]);
      } catch (error) {
        throw mapDbError(error, "Could not save the seller profile.");
      }
    },
    async listSellerListingsForClerkUserId(clerkUserId) {
      try {
        const result = await pool.query<SellerListingRow>(
          `SELECT listings.*
           FROM seller_listings AS listings
           JOIN seller_profiles AS profiles
             ON profiles.id = listings.seller_profile_id
           WHERE profiles.clerk_user_id = $1
           ORDER BY listings.updated_at DESC`,
          [clerkUserId],
        );
        return result.rows.map(sellerListingFromRow);
      } catch (error) {
        throw mapDbError(error, "Could not load seller listings.");
      }
    },
    async listPublishedSellerListings() {
      try {
        const result = await pool.query<SellerListingRow>(
          `SELECT * FROM seller_listings
           WHERE status = 'published'
           ORDER BY updated_at DESC`,
        );
        return result.rows.map(sellerListingFromRow);
      } catch (error) {
        throw mapDbError(error, "Could not load published seller listings.");
      }
    },
    async getPublishedSellerListingById(id) {
      try {
        const result = await pool.query<SellerListingRow>(
          `SELECT * FROM seller_listings
           WHERE id = $1 AND status = 'published'
           LIMIT 1`,
          [id],
        );
        return result.rows[0] ? sellerListingFromRow(result.rows[0]) : undefined;
      } catch (error) {
        throw mapDbError(error, "Could not load the seller listing.");
      }
    },
    async insertSellerListingForClerkUserId(clerkUserId, listing) {
      try {
        if (
          listing.price.currency !== "USD" ||
          !Number.isSafeInteger(listing.price.amountMinor) ||
          listing.price.amountMinor <= 0
        ) {
          throw new StoreError("Seller listings must have a valid positive USD price.");
        }
        const result = await pool.query<SellerListingRow>(
          `INSERT INTO seller_listings (
            id, seller_profile_id, title, description, price_minor, currency,
            duration_minutes, availability_note, status, created_at, updated_at
          )
          SELECT $1, profile.id, $3, $4, $5, 'USD', $6, $7, $8,
                 $9::timestamptz, $10::timestamptz
          FROM seller_profiles AS profile
          WHERE profile.clerk_user_id = $2
          RETURNING *`,
          [
            listing.id,
            clerkUserId,
            listing.title,
            listing.description,
            listing.price.amountMinor,
            listing.durationMinutes,
            listing.availabilityNote,
            listing.status,
            listing.createdAt,
            listing.updatedAt,
          ],
        );
        if (!result.rows[0]) {
          throw new StoreError("Seller profile not found.", "not_found");
        }
        return sellerListingFromRow(result.rows[0]);
      } catch (error) {
        throw mapDbError(error, "Could not save seller listing.");
      }
    },
  };
}
