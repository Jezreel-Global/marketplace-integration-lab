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
} from "@/lib/store/row-mappers";
import { StoreError, type MarketplaceStore } from "@/lib/store/types";

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
  const result = await db.query<BookingRow>(
    `INSERT INTO runtime_bookings (
      id, listing_id, provider_id, customer_name, customer_email,
      scheduled_for, amount_kobo, currency, platform_fee_kobo, provider_share_kobo,
      status, payment_mode, payment_attempt_status, data_source, created_at, status_note
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6::timestamptz, $7, $8, $9, $10,
      $11, $12, $13, $14, $15::timestamptz, $16
    )
    RETURNING *`,
    [
      booking.id,
      booking.listingId,
      booking.providerId,
      booking.customerName,
      booking.customerEmail,
      booking.scheduledFor,
      booking.amountKobo,
      booking.currency,
      booking.platformFeeKobo,
      booking.providerShareKobo,
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
      amount_kobo, currency, data_source, note, created_at
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10::timestamptz
    )
    RETURNING *`,
    [
      attempt.id,
      attempt.bookingId,
      attempt.provider,
      attempt.mode,
      attempt.status,
      attempt.amountKobo,
      attempt.currency,
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
  const result = await db.query<BookingRow>(
    `UPDATE runtime_bookings SET
      listing_id = $2,
      provider_id = $3,
      customer_name = $4,
      customer_email = $5,
      scheduled_for = $6::timestamptz,
      amount_kobo = $7,
      currency = $8,
      platform_fee_kobo = $9,
      provider_share_kobo = $10,
      status = $11,
      payment_mode = $12,
      payment_attempt_status = $13,
      data_source = $14,
      status_note = $15,
      updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [
      booking.id,
      booking.listingId,
      booking.providerId,
      booking.customerName,
      booking.customerEmail,
      booking.scheduledFor,
      booking.amountKobo,
      booking.currency,
      booking.platformFeeKobo,
      booking.providerShareKobo,
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
        return await insertBookingQuery(pool, booking);
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
  };
}
