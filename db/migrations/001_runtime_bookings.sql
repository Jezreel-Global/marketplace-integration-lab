-- Milestone 2C: runtime bookings + payment attempts (seed catalog stays in code).
-- Idempotent / repeatable: safe to re-run.

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS runtime_bookings (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  amount_kobo INTEGER NOT NULL CHECK (amount_kobo >= 0),
  currency TEXT NOT NULL DEFAULT 'NGN' CHECK (currency = 'NGN'),
  platform_fee_kobo INTEGER NOT NULL CHECK (platform_fee_kobo >= 0),
  provider_share_kobo INTEGER NOT NULL CHECK (provider_share_kobo >= 0),
  status TEXT NOT NULL,
  payment_mode TEXT NOT NULL,
  payment_attempt_status TEXT NOT NULL,
  data_source TEXT NOT NULL DEFAULT 'mock',
  created_at TIMESTAMPTZ NOT NULL,
  status_note TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT runtime_bookings_fee_split_chk CHECK (
    platform_fee_kobo + provider_share_kobo = amount_kobo
  )
);

CREATE TABLE IF NOT EXISTS runtime_payment_attempts (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES runtime_bookings (id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  mode TEXT NOT NULL,
  status TEXT NOT NULL,
  amount_kobo INTEGER NOT NULL CHECK (amount_kobo >= 0),
  currency TEXT NOT NULL DEFAULT 'NGN' CHECK (currency = 'NGN'),
  data_source TEXT NOT NULL DEFAULT 'mock',
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_runtime_bookings_provider_id
  ON runtime_bookings (provider_id);

CREATE INDEX IF NOT EXISTS idx_runtime_bookings_created_at
  ON runtime_bookings (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_runtime_payment_attempts_booking_id
  ON runtime_payment_attempts (booking_id);
