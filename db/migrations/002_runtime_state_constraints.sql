-- Enforce this milestone's simulation-only runtime states. Future provider
-- integrations must expand these constraints in a separately reviewed migration.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'runtime_bookings_status_chk'
      AND conrelid = 'runtime_bookings'::regclass
  ) THEN
    ALTER TABLE runtime_bookings
      ADD CONSTRAINT runtime_bookings_status_chk
      CHECK (status IN (
        'pending_payment', 'paid', 'cancelled', 'payment_failed'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'runtime_bookings_payment_mode_chk'
      AND conrelid = 'runtime_bookings'::regclass
  ) THEN
    ALTER TABLE runtime_bookings
      ADD CONSTRAINT runtime_bookings_payment_mode_chk
      CHECK (payment_mode = 'simulated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'runtime_bookings_attempt_status_chk'
      AND conrelid = 'runtime_bookings'::regclass
  ) THEN
    ALTER TABLE runtime_bookings
      ADD CONSTRAINT runtime_bookings_attempt_status_chk
      CHECK (payment_attempt_status IN (
        'not_started', 'succeeded', 'failed', 'cancelled'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'runtime_bookings_data_source_chk'
      AND conrelid = 'runtime_bookings'::regclass
  ) THEN
    ALTER TABLE runtime_bookings
      ADD CONSTRAINT runtime_bookings_data_source_chk
      CHECK (data_source = 'mock');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'runtime_payment_attempts_provider_chk'
      AND conrelid = 'runtime_payment_attempts'::regclass
  ) THEN
    ALTER TABLE runtime_payment_attempts
      ADD CONSTRAINT runtime_payment_attempts_provider_chk
      CHECK (provider = 'mock');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'runtime_payment_attempts_mode_chk'
      AND conrelid = 'runtime_payment_attempts'::regclass
  ) THEN
    ALTER TABLE runtime_payment_attempts
      ADD CONSTRAINT runtime_payment_attempts_mode_chk
      CHECK (mode = 'simulated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'runtime_payment_attempts_status_chk'
      AND conrelid = 'runtime_payment_attempts'::regclass
  ) THEN
    ALTER TABLE runtime_payment_attempts
      ADD CONSTRAINT runtime_payment_attempts_status_chk
      CHECK (status IN (
        'succeeded', 'failed'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'runtime_payment_attempts_data_source_chk'
      AND conrelid = 'runtime_payment_attempts'::regclass
  ) THEN
    ALTER TABLE runtime_payment_attempts
      ADD CONSTRAINT runtime_payment_attempts_data_source_chk
      CHECK (data_source = 'mock');
  END IF;
END $$;
