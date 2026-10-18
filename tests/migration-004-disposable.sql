\set ON_ERROR_STOP on

-- DISPOSABLE ONLY: run inside pg_virtualenv. No environment file or
-- DATABASE_URL is used by this fixture.
\ir ../db/migrations/001_runtime_bookings.sql
\ir ../db/migrations/002_runtime_state_constraints.sql
\ir ../db/migrations/003_seller_profiles.sql

INSERT INTO runtime_bookings (
  id, listing_id, provider_id, customer_name, customer_email, scheduled_for,
  amount_kobo, currency, platform_fee_kobo, provider_share_kobo, status,
  payment_mode, payment_attempt_status, data_source, created_at, status_note
) VALUES (
  'historical', 'seed_listing', 'seed_provider', 'Fixture', 'fixture@example.invalid',
  now(), 101, 'NGN', 10, 91, 'pending_payment', 'simulated', 'not_started',
  'mock', now(), 'synthetic historical row'
);
INSERT INTO runtime_payment_attempts (
  id, booking_id, provider, mode, status, amount_kobo, currency,
  data_source, note, created_at
) VALUES ('historical_attempt', 'historical', 'mock', 'simulated', 'succeeded',
  101, 'NGN', 'mock', 'synthetic historical row', now());

\ir ../db/migrations/004_currency_aware_marketplace.sql

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM runtime_bookings WHERE id = 'historical'
      AND amount_kobo = 101 AND amount_minor = 101 AND platform_fee_minor = 10
      AND provider_share_minor = 91 AND currency = 'NGN') THEN
    RAISE EXCEPTION 'historical booking backfill changed or lost values';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM runtime_payment_attempts WHERE id = 'historical_attempt'
      AND amount_kobo = 101 AND amount_minor = 101 AND currency = 'NGN') THEN
    RAISE EXCEPTION 'historical payment backfill changed or lost values';
  END IF;
END $$;

CREATE FUNCTION test_assert_rejected(sql_text TEXT, expected_state TEXT, expected_message TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE actual_state TEXT; actual_message TEXT;
BEGIN
  EXECUTE sql_text;
  RAISE EXCEPTION 'Expected SQL statement to be rejected: %', sql_text;
EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS actual_state = RETURNED_SQLSTATE, actual_message = MESSAGE_TEXT;
  IF actual_state <> expected_state OR actual_message NOT LIKE '%' || expected_message || '%' THEN
    RAISE EXCEPTION 'Expected SQLSTATE % containing %, got %: %',
      expected_state, expected_message, actual_state, actual_message;
  END IF;
END $$;

-- Legacy-only insert and update preserve the integer kobo meaning.
INSERT INTO runtime_bookings (
  id, listing_id, provider_id, customer_name, customer_email, scheduled_for,
  amount_kobo, currency, platform_fee_kobo, provider_share_kobo, status,
  payment_mode, payment_attempt_status, data_source, created_at, status_note
) VALUES (
  'legacy_write', 'seed_listing', 'seed_provider', 'Legacy', 'legacy@example.invalid',
  now(), 200, 'NGN', 20, 180, 'pending_payment', 'simulated', 'not_started',
  'mock', now(), 'legacy-only write'
);
UPDATE runtime_bookings SET amount_kobo = 220, platform_fee_kobo = 22,
  provider_share_kobo = 198 WHERE id = 'legacy_write';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM runtime_bookings WHERE id = 'legacy_write'
      AND amount_minor = 220 AND platform_fee_minor = 22
      AND provider_share_minor = 198) THEN
    RAISE EXCEPTION 'legacy-only update was not copied to canonical fields';
  END IF;
END $$;

BEGIN;
SELECT set_config('marketplace.currency_aware_money_write', 'true', true);

-- Canonical-only NGN write synchronizes legacy values. Matching dual writes pass.
INSERT INTO runtime_bookings (
  id, listing_id, provider_id, customer_name, customer_email, scheduled_for,
  amount_minor, currency, platform_fee_minor, provider_share_minor, status,
  payment_mode, payment_attempt_status, data_source, created_at, status_note
) VALUES (
  'canonical_ngn', 'seed_listing', 'seed_provider', 'Canonical', 'canonical@example.invalid',
  now(), 250, 'NGN', 25, 225, 'pending_payment', 'simulated', 'not_started',
  'mock', now(), 'canonical-only write'
);
INSERT INTO runtime_bookings (
  id, listing_id, provider_id, customer_name, customer_email, scheduled_for,
  amount_minor, amount_kobo, currency, platform_fee_minor, platform_fee_kobo,
  provider_share_minor, provider_share_kobo, status, payment_mode,
  payment_attempt_status, data_source, created_at, status_note
) VALUES (
  'dual_ngn', 'seed_listing', 'seed_provider', 'Dual', 'dual@example.invalid',
  now(), 300, 300, 'NGN', 30, 30, 270, 270, 'pending_payment', 'simulated',
  'not_started', 'mock', now(), 'consistent dual write'
);

SELECT test_assert_rejected($sql$
  INSERT INTO runtime_bookings (
    id, listing_id, provider_id, customer_name, customer_email, scheduled_for,
    amount_minor, amount_kobo, currency, platform_fee_minor, platform_fee_kobo,
    provider_share_minor, provider_share_kobo, status, payment_mode,
    payment_attempt_status, data_source, created_at, status_note
  ) VALUES ('bad_dual', 'seed_listing', 'seed_provider', 'Bad', 'bad@example.invalid',
    now(), 300, 301, 'NGN', 30, 30, 270, 270, 'pending_payment', 'simulated',
    'not_started', 'mock', now(), 'conflicting dual write')
$sql$, 'P0001', 'canonical and legacy money values conflict');
SELECT test_assert_rejected(
  'UPDATE runtime_bookings SET amount_minor = 300, amount_kobo = 301 WHERE id = ''dual_ngn''',
  'P0001', 'canonical and legacy money values conflict');

-- USD payment snapshots are exact and the composite FK rejects mismatches.
INSERT INTO runtime_bookings (
  id, listing_id, provider_id, customer_name, customer_email, scheduled_for,
  amount_minor, currency, platform_fee_minor, provider_share_minor, status,
  payment_mode, payment_attempt_status, data_source, created_at, status_note
) VALUES (
  'usd_booking', 'seller_listing', 'seller_profile', 'USD', 'usd@example.invalid',
  now(), 2599, 'USD', 259, 2340, 'pending_payment', 'simulated', 'not_started',
  'mock', now(), 'USD fixture'
);
INSERT INTO runtime_payment_attempts (
  id, booking_id, provider, mode, status, amount_minor, currency,
  data_source, note, created_at
) VALUES ('usd_attempt', 'usd_booking', 'mock', 'simulated', 'succeeded',
  2599, 'USD', 'mock', 'USD fixture', now());

-- Payment-attempt UPDATEs must keep their old and canonical representation in
-- sync across NGN/USD transitions as well.
INSERT INTO runtime_bookings (
  id, listing_id, provider_id, customer_name, customer_email, scheduled_for,
  amount_minor, currency, platform_fee_minor, provider_share_minor, status,
  payment_mode, payment_attempt_status, data_source, created_at, status_note
) VALUES
  ('attempt_ngn_booking', 'seed_listing', 'seed_provider', 'NGN', 'a-ngn@example.invalid',
   now(), 100, 'NGN', 10, 90, 'pending_payment', 'simulated', 'not_started',
   'mock', now(), 'attempt currency fixture'),
  ('attempt_usd_booking', 'seed_listing', 'seed_provider', 'USD', 'a-usd@example.invalid',
   now(), 250, 'USD', 25, 225, 'pending_payment', 'simulated', 'not_started',
   'mock', now(), 'attempt currency fixture');
INSERT INTO runtime_payment_attempts (
  id, booking_id, provider, mode, status, amount_minor, currency,
  data_source, note, created_at
) VALUES ('attempt_transition', 'attempt_ngn_booking', 'mock', 'simulated',
  'succeeded', 100, 'NGN', 'mock', 'attempt transition', now());
UPDATE runtime_payment_attempts SET booking_id = 'attempt_usd_booking',
  amount_minor = 250, currency = 'USD', amount_kobo = NULL
WHERE id = 'attempt_transition';
UPDATE runtime_payment_attempts SET booking_id = 'attempt_ngn_booking',
  amount_minor = 100, currency = 'NGN' WHERE id = 'attempt_transition';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM runtime_payment_attempts WHERE id = 'attempt_transition'
      AND currency = 'NGN' AND amount_minor = 100 AND amount_kobo = 100) THEN
    RAISE EXCEPTION 'payment-attempt transition left stale compatibility money';
  END IF;
END $$;

SELECT test_assert_rejected(
  'INSERT INTO runtime_payment_attempts (id, booking_id, provider, mode, status, amount_minor, currency, data_source, note, created_at) VALUES (''bad_amount'', ''usd_booking'', ''mock'', ''simulated'', ''succeeded'', 2600, ''USD'', ''mock'', ''mismatch'', now())',
  '23503', 'runtime_payment_attempts_booking_currency_fk');
SELECT test_assert_rejected(
  'INSERT INTO runtime_payment_attempts (id, booking_id, provider, mode, status, amount_minor, currency, data_source, note, created_at) VALUES (''bad_currency'', ''usd_booking'', ''mock'', ''simulated'', ''succeeded'', 2599, ''NGN'', ''mock'', ''mismatch'', now())',
  '23503', 'runtime_payment_attempts_booking_currency_fk');

INSERT INTO seller_profiles (id, clerk_user_id, display_name)
VALUES ('seller_fixture', 'clerk_fixture', 'Fixture seller');
INSERT INTO seller_listings (
  id, seller_profile_id, title, description, price_minor, currency,
  duration_minutes, availability_note, status
) VALUES ('safe_price', 'seller_fixture', 'Boundary',
  'Synthetic seller listing at safe integer boundary.', 9007199254740991,
  'USD', 60, 'synthetic', 'draft');
INSERT INTO runtime_bookings (
  id, listing_id, provider_id, customer_name, customer_email, scheduled_for,
  amount_minor, currency, platform_fee_minor, provider_share_minor, status,
  payment_mode, payment_attempt_status, data_source, created_at, status_note
) VALUES (
  'safe_boundary', 'seed_listing', 'seed_provider', 'Boundary', 'boundary@example.invalid',
  now(), 9007199254740991, 'USD', 0, 9007199254740991, 'pending_payment',
  'simulated', 'not_started', 'mock', now(), 'Number.MAX_SAFE_INTEGER'
);

SELECT test_assert_rejected($sql$
  INSERT INTO runtime_bookings (
    id, listing_id, provider_id, customer_name, customer_email, scheduled_for,
    amount_minor, currency, platform_fee_minor, provider_share_minor, status,
    payment_mode, payment_attempt_status, data_source, created_at, status_note
  ) VALUES ('too_large', 'seed_listing', 'seed_provider', 'Large', 'large@example.invalid',
    now(), 9007199254740992, 'USD', 0, 9007199254740992, 'pending_payment',
    'simulated', 'not_started', 'mock', now(), 'out of range')
$sql$, '23514', 'runtime_bookings_amount_minor_chk');
SELECT test_assert_rejected($sql$
  INSERT INTO seller_listings (id, seller_profile_id, title, description, price_minor,
    currency, duration_minutes, availability_note, status)
  VALUES ('too_large_price', 'seller_fixture', 'Too large',
    'Synthetic seller listing outside safe integer range.', 9007199254740992,
    'USD', 60, 'synthetic', 'draft')
$sql$, '23514', 'seller_listings_price_minor_check');
SELECT test_assert_rejected(
  'INSERT INTO runtime_payment_attempts (id, booking_id, provider, mode, status, amount_minor, currency, data_source, note, created_at) VALUES (''negative_attempt'', ''usd_booking'', ''mock'', ''simulated'', ''succeeded'', -1, ''USD'', ''mock'', ''negative'', now())',
  '23514', 'runtime_payment_attempts_amount_minor_chk');
SELECT test_assert_rejected(
  'INSERT INTO runtime_payment_attempts (id, booking_id, provider, mode, status, amount_minor, currency, data_source, note, created_at) VALUES (''too_large_attempt'', ''safe_boundary'', ''mock'', ''simulated'', ''succeeded'', 9007199254740992, ''USD'', ''mock'', ''out of range'', now())',
  '23514', 'runtime_payment_attempts_amount_minor_chk');
SELECT test_assert_rejected($sql$
  INSERT INTO runtime_bookings (
    id, listing_id, provider_id, customer_name, customer_email, scheduled_for,
    amount_minor, currency, platform_fee_minor, provider_share_minor, status,
    payment_mode, payment_attempt_status, data_source, created_at, status_note
  ) VALUES ('negative_booking', 'seed_listing', 'seed_provider', 'Negative',
    'negative@example.invalid', now(), -1, 'USD', 0, -1, 'pending_payment',
    'simulated', 'not_started', 'mock', now(), 'negative')
$sql$, '23514', 'runtime_bookings_amount_minor_chk');
SELECT test_assert_rejected($sql$
  INSERT INTO runtime_bookings (
    id, listing_id, provider_id, customer_name, customer_email, scheduled_for,
    amount_minor, currency, platform_fee_minor, provider_share_minor, status,
    payment_mode, payment_attempt_status, data_source, created_at, status_note
  ) VALUES ('unsupported_currency', 'seed_listing', 'seed_provider', 'Currency',
    'currency@example.invalid', now(), 100, 'EUR', 10, 90, 'pending_payment',
    'simulated', 'not_started', 'mock', now(), 'unsupported currency')
$sql$, '23514', 'runtime_bookings_currency_chk');

-- A currency transition clears and then restores the legacy NGN columns.
INSERT INTO runtime_bookings (
  id, listing_id, provider_id, customer_name, customer_email, scheduled_for,
  amount_minor, currency, platform_fee_minor, provider_share_minor, status,
  payment_mode, payment_attempt_status, data_source, created_at, status_note
) VALUES ('transition', 'seed_listing', 'seed_provider', 'Transition',
  'transition@example.invalid', now(), 100, 'NGN', 10, 90, 'pending_payment',
  'simulated', 'not_started', 'mock', now(), 'transition');
UPDATE runtime_bookings SET currency = 'USD', amount_minor = 250,
  platform_fee_minor = 25, provider_share_minor = 225,
  amount_kobo = NULL, platform_fee_kobo = NULL, provider_share_kobo = NULL
WHERE id = 'transition';
UPDATE runtime_bookings SET currency = 'NGN', amount_minor = 200,
  platform_fee_minor = 20, provider_share_minor = 180 WHERE id = 'transition';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM runtime_bookings WHERE id = 'transition'
      AND currency = 'NGN' AND amount_minor = 200 AND amount_kobo = 200) THEN
    RAISE EXCEPTION 'currency transition left stale compatibility money';
  END IF;
END $$;

COMMIT;
\echo 'Migration 004 disposable PostgreSQL checks passed.'
