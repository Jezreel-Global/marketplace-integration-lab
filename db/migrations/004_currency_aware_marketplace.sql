-- Currency-aware persistence. This migration is additive for historical money:
-- the old kobo columns remain as NGN compatibility fields and are never used
-- to encode USD. Apply only after confirming 001-003 history on the target DB.
-- All canonical BIGINT amounts use the Number.MAX_SAFE_INTEGER bound:
-- 9007199254740991 minor units.

ALTER TABLE runtime_bookings
  ADD COLUMN IF NOT EXISTS amount_minor BIGINT,
  ADD COLUMN IF NOT EXISTS platform_fee_minor BIGINT,
  ADD COLUMN IF NOT EXISTS provider_share_minor BIGINT;

-- A previous partial/manual rollout must never have its canonical values
-- silently replaced by the legacy backfill. Refuse contradictory or unsafe
-- pre-existing canonical values before filling any missing fields.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM runtime_bookings
    WHERE (amount_minor IS NULL AND amount_kobo IS NULL)
       OR (platform_fee_minor IS NULL AND platform_fee_kobo IS NULL)
       OR (provider_share_minor IS NULL AND provider_share_kobo IS NULL)
       OR (amount_minor IS NOT NULL AND amount_minor NOT BETWEEN 0 AND 9007199254740991)
       OR (platform_fee_minor IS NOT NULL AND platform_fee_minor NOT BETWEEN 0 AND 9007199254740991)
       OR (provider_share_minor IS NOT NULL AND provider_share_minor NOT BETWEEN 0 AND 9007199254740991)
       OR (amount_minor IS NOT NULL AND amount_kobo IS NOT NULL AND amount_minor <> amount_kobo::BIGINT)
       OR (platform_fee_minor IS NOT NULL AND platform_fee_kobo IS NOT NULL AND platform_fee_minor <> platform_fee_kobo::BIGINT)
       OR (provider_share_minor IS NOT NULL AND provider_share_kobo IS NOT NULL AND provider_share_minor <> provider_share_kobo::BIGINT)
  ) THEN
    RAISE EXCEPTION 'runtime_bookings has unsafe or conflicting canonical money; inspect before migration';
  END IF;
END $$;

UPDATE runtime_bookings
SET amount_minor = COALESCE(amount_minor, amount_kobo::BIGINT),
    platform_fee_minor = COALESCE(platform_fee_minor, platform_fee_kobo::BIGINT),
    provider_share_minor = COALESCE(provider_share_minor, provider_share_kobo::BIGINT)
WHERE amount_minor IS NULL
   OR platform_fee_minor IS NULL
   OR provider_share_minor IS NULL;

-- JavaScript row mappers use Number. Refuse existing canonical values that
-- cannot be represented exactly before installing constraints or triggers.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM runtime_bookings
    WHERE amount_minor NOT BETWEEN 0 AND 9007199254740991
       OR platform_fee_minor NOT BETWEEN 0 AND 9007199254740991
       OR provider_share_minor NOT BETWEEN 0 AND 9007199254740991
  ) THEN
    RAISE EXCEPTION 'runtime_bookings contains money outside the supported safe-integer range';
  END IF;
END $$;

ALTER TABLE runtime_bookings
  ALTER COLUMN amount_minor SET NOT NULL,
  ALTER COLUMN platform_fee_minor SET NOT NULL,
  ALTER COLUMN provider_share_minor SET NOT NULL,
  ALTER COLUMN amount_kobo DROP NOT NULL,
  ALTER COLUMN platform_fee_kobo DROP NOT NULL,
  ALTER COLUMN provider_share_kobo DROP NOT NULL,
  ALTER COLUMN currency DROP DEFAULT;

ALTER TABLE runtime_bookings
  DROP CONSTRAINT IF EXISTS runtime_bookings_currency_check,
  ADD CONSTRAINT runtime_bookings_currency_chk
    CHECK (currency IN ('NGN', 'USD')),
  ADD CONSTRAINT runtime_bookings_amount_minor_chk
    CHECK (amount_minor BETWEEN 0 AND 9007199254740991),
  ADD CONSTRAINT runtime_bookings_platform_fee_minor_chk
    CHECK (platform_fee_minor BETWEEN 0 AND 9007199254740991),
  ADD CONSTRAINT runtime_bookings_provider_share_minor_chk
    CHECK (provider_share_minor BETWEEN 0 AND 9007199254740991),
  ADD CONSTRAINT runtime_bookings_minor_split_chk
    CHECK (platform_fee_minor + provider_share_minor = amount_minor),
  ADD CONSTRAINT runtime_bookings_legacy_ngn_values_chk
    CHECK (
      (currency = 'NGN'
        AND amount_minor <= 2147483647
        AND amount_kobo IS NOT NULL
        AND platform_fee_kobo IS NOT NULL
        AND provider_share_kobo IS NOT NULL
        AND amount_kobo::BIGINT = amount_minor
        AND platform_fee_kobo::BIGINT = platform_fee_minor
        AND provider_share_kobo::BIGINT = provider_share_minor)
      OR
      (currency = 'USD'
        AND amount_kobo IS NULL
        AND platform_fee_kobo IS NULL
        AND provider_share_kobo IS NULL)
    );

ALTER TABLE runtime_bookings
  ADD CONSTRAINT runtime_bookings_payment_snapshot_uniq
    UNIQUE (id, currency, amount_minor);

ALTER TABLE runtime_payment_attempts
  ADD COLUMN IF NOT EXISTS amount_minor BIGINT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM runtime_payment_attempts
    WHERE (amount_minor IS NULL AND amount_kobo IS NULL)
       OR (amount_minor IS NOT NULL AND amount_minor NOT BETWEEN 0 AND 9007199254740991)
       OR (amount_minor IS NOT NULL AND amount_kobo IS NOT NULL AND amount_minor <> amount_kobo::BIGINT)
  ) THEN
    RAISE EXCEPTION 'runtime_payment_attempts has unsafe or conflicting canonical money; inspect before migration';
  END IF;
END $$;

UPDATE runtime_payment_attempts
SET amount_minor = COALESCE(amount_minor, amount_kobo::BIGINT)
WHERE amount_minor IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM runtime_payment_attempts
    WHERE amount_minor NOT BETWEEN 0 AND 9007199254740991
  ) THEN
    RAISE EXCEPTION 'runtime_payment_attempts contains money outside the supported safe-integer range';
  END IF;
END $$;

-- Fail with a useful diagnosis instead of silently rewriting historic payment
-- snapshots. The composite FK below independently enforces this invariant.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM runtime_payment_attempts AS attempt
    LEFT JOIN runtime_bookings AS booking ON booking.id = attempt.booking_id
    WHERE booking.id IS NULL
       OR attempt.currency IS DISTINCT FROM booking.currency
       OR attempt.amount_minor IS DISTINCT FROM booking.amount_minor
  ) THEN
    RAISE EXCEPTION 'runtime_payment_attempts contains rows that do not match their booking amount and currency';
  END IF;
END $$;

ALTER TABLE runtime_payment_attempts
  ALTER COLUMN amount_minor SET NOT NULL,
  ALTER COLUMN amount_kobo DROP NOT NULL,
  ALTER COLUMN currency DROP DEFAULT;

ALTER TABLE runtime_payment_attempts
  DROP CONSTRAINT IF EXISTS runtime_payment_attempts_currency_check,
  ADD CONSTRAINT runtime_payment_attempts_currency_chk
    CHECK (currency IN ('NGN', 'USD')),
  ADD CONSTRAINT runtime_payment_attempts_amount_minor_chk
    CHECK (amount_minor BETWEEN 0 AND 9007199254740991),
  ADD CONSTRAINT runtime_payment_attempts_legacy_ngn_value_chk
    CHECK (
      (currency = 'NGN' AND amount_minor <= 2147483647 AND amount_kobo IS NOT NULL
        AND amount_kobo::BIGINT = amount_minor)
      OR (currency = 'USD' AND amount_kobo IS NULL)
    ),
  ADD CONSTRAINT runtime_payment_attempts_booking_currency_fk
    FOREIGN KEY (booking_id, currency, amount_minor)
    REFERENCES runtime_bookings (id, currency, amount_minor)
    ON DELETE CASCADE;

-- Keep existing application versions able to write NGN-only records during a
-- controlled rollout: omitted canonical values are copied from kobo fields.
-- Currency-aware application writes still provide explicit currency/snapshots.
-- Current application transactions set this local flag before money writes.
-- Older NGN-only clients do not, so updates that change only legacy columns
-- remain compatible. The flag is transaction-local and cannot leak through
-- pooled connections after COMMIT/ROLLBACK.
CREATE OR REPLACE FUNCTION sync_runtime_booking_money_columns()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_currency_aware BOOLEAN :=
    COALESCE(current_setting('marketplace.currency_aware_money_write', true) = 'true', false);
  v_canonical_changed BOOLEAN := false;
  v_legacy_changed BOOLEAN := false;
BEGIN
  IF NEW.currency = 'NGN' THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.amount_minor IS NULL THEN
        IF v_currency_aware THEN
          RAISE EXCEPTION 'Currency-aware booking write requires canonical money values';
        END IF;
        NEW.amount_minor := NEW.amount_kobo::BIGINT;
        NEW.platform_fee_minor := NEW.platform_fee_kobo::BIGINT;
        NEW.provider_share_minor := NEW.provider_share_kobo::BIGINT;
      END IF;
    ELSIF NOT v_currency_aware THEN
      v_canonical_changed :=
        NEW.amount_minor IS DISTINCT FROM OLD.amount_minor OR
        NEW.platform_fee_minor IS DISTINCT FROM OLD.platform_fee_minor OR
        NEW.provider_share_minor IS DISTINCT FROM OLD.provider_share_minor;
      v_legacy_changed :=
        NEW.amount_kobo IS DISTINCT FROM OLD.amount_kobo OR
        NEW.platform_fee_kobo IS DISTINCT FROM OLD.platform_fee_kobo OR
        NEW.provider_share_kobo IS DISTINCT FROM OLD.provider_share_kobo;
      IF v_legacy_changed AND NOT v_canonical_changed THEN
        NEW.amount_minor := NEW.amount_kobo::BIGINT;
        NEW.platform_fee_minor := NEW.platform_fee_kobo::BIGINT;
        NEW.provider_share_minor := NEW.provider_share_kobo::BIGINT;
      END IF;
    END IF;

    IF NEW.amount_minor IS NULL OR NEW.platform_fee_minor IS NULL OR
       NEW.provider_share_minor IS NULL THEN
      RAISE EXCEPTION 'NGN booking money snapshot is required';
    END IF;
    IF NEW.amount_minor NOT BETWEEN 0 AND 2147483647 OR
       NEW.platform_fee_minor NOT BETWEEN 0 AND 2147483647 OR
       NEW.provider_share_minor NOT BETWEEN 0 AND 2147483647 THEN
      RAISE EXCEPTION 'NGN booking money must fit the legacy INTEGER kobo range';
    END IF;
    IF (NEW.amount_kobo IS NOT NULL AND NEW.amount_kobo::BIGINT <> NEW.amount_minor) OR
       (NEW.platform_fee_kobo IS NOT NULL AND NEW.platform_fee_kobo::BIGINT <> NEW.platform_fee_minor) OR
       (NEW.provider_share_kobo IS NOT NULL AND NEW.provider_share_kobo::BIGINT <> NEW.provider_share_minor) THEN
      RAISE EXCEPTION 'NGN booking canonical and legacy money values conflict';
    END IF;
    NEW.amount_kobo := NEW.amount_minor::INTEGER;
    NEW.platform_fee_kobo := NEW.platform_fee_minor::INTEGER;
    NEW.provider_share_kobo := NEW.provider_share_minor::INTEGER;
  ELSIF NEW.currency = 'USD' THEN
    IF NEW.amount_minor IS NULL OR NEW.platform_fee_minor IS NULL OR
       NEW.provider_share_minor IS NULL OR NEW.amount_kobo IS NOT NULL OR
       NEW.platform_fee_kobo IS NOT NULL OR NEW.provider_share_kobo IS NOT NULL THEN
      RAISE EXCEPTION 'USD booking requires canonical money and no legacy kobo values';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION sync_runtime_payment_attempt_money_columns()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_currency_aware BOOLEAN :=
    COALESCE(current_setting('marketplace.currency_aware_money_write', true) = 'true', false);
BEGIN
  IF NEW.currency = 'NGN' THEN
    IF TG_OP = 'INSERT' AND NEW.amount_minor IS NULL THEN
      IF v_currency_aware THEN
        RAISE EXCEPTION 'Currency-aware payment attempt requires a canonical amount';
      END IF;
      NEW.amount_minor := NEW.amount_kobo::BIGINT;
    ELSIF TG_OP = 'UPDATE' AND NOT v_currency_aware AND
      NEW.amount_minor IS NOT DISTINCT FROM OLD.amount_minor AND
      NEW.amount_kobo IS DISTINCT FROM OLD.amount_kobo THEN
      NEW.amount_minor := NEW.amount_kobo::BIGINT;
    END IF;
    IF NEW.amount_minor IS NULL OR NEW.amount_minor NOT BETWEEN 0 AND 2147483647 THEN
      RAISE EXCEPTION 'NGN payment attempt amount is required and must fit legacy kobo range';
    END IF;
    IF NEW.amount_kobo IS NOT NULL AND NEW.amount_kobo::BIGINT <> NEW.amount_minor THEN
      RAISE EXCEPTION 'NGN payment attempt canonical and legacy amount conflict';
    END IF;
    NEW.amount_kobo := NEW.amount_minor::INTEGER;
  ELSIF NEW.currency = 'USD' THEN
    IF NEW.amount_minor IS NULL OR NEW.amount_kobo IS NOT NULL THEN
      RAISE EXCEPTION 'USD payment attempt requires canonical money and no legacy kobo value';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS runtime_bookings_sync_money ON runtime_bookings;
CREATE TRIGGER runtime_bookings_sync_money
BEFORE INSERT OR UPDATE ON runtime_bookings
FOR EACH ROW EXECUTE FUNCTION sync_runtime_booking_money_columns();

DROP TRIGGER IF EXISTS runtime_payment_attempts_sync_money ON runtime_payment_attempts;
CREATE TRIGGER runtime_payment_attempts_sync_money
BEFORE INSERT OR UPDATE ON runtime_payment_attempts
FOR EACH ROW EXECUTE FUNCTION sync_runtime_payment_attempt_money_columns();

CREATE INDEX IF NOT EXISTS idx_runtime_bookings_currency_created_at
  ON runtime_bookings (currency, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_runtime_payment_attempts_currency_created_at
  ON runtime_payment_attempts (currency, created_at DESC);

-- Real seller listings remain distinct from the immutable seed catalog.
-- Owner is a seller_profiles row, not a fictional provider ID or client claim.
CREATE TABLE IF NOT EXISTS seller_listings (
  id TEXT PRIMARY KEY,
  seller_profile_id TEXT NOT NULL
    REFERENCES seller_profiles (id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 3 AND 120),
  description TEXT NOT NULL CHECK (char_length(trim(description)) BETWEEN 10 AND 2000),
  price_minor BIGINT NOT NULL
    CHECK (price_minor BETWEEN 1 AND 9007199254740991),
  currency TEXT NOT NULL CHECK (currency = 'USD'),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes BETWEEN 1 AND 10080),
  availability_note TEXT NOT NULL CHECK (char_length(trim(availability_note)) BETWEEN 2 AND 240),
  status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'paused')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seller_listings_owner_updated
  ON seller_listings (seller_profile_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_seller_listings_published_updated
  ON seller_listings (status, updated_at DESC)
  WHERE status = 'published';

ALTER TABLE runtime_bookings
  ADD COLUMN IF NOT EXISTS seller_listing_id TEXT
    REFERENCES seller_listings (id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_runtime_bookings_seller_listing_id
  ON runtime_bookings (seller_listing_id)
  WHERE seller_listing_id IS NOT NULL;
