-- Milestone 3B: authenticated seller identities; seed providers remain separate.
CREATE TABLE IF NOT EXISTS seller_profiles (
  id TEXT PRIMARY KEY,
  clerk_user_id TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL CHECK (char_length(trim(display_name)) BETWEEN 2 AND 80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_seller_profiles_created_at ON seller_profiles (created_at DESC);
