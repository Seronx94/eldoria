CREATE TABLE IF NOT EXISTS accounts (
 id uuid PRIMARY KEY,
 email text NOT NULL UNIQUE CHECK (email = lower(email)),
 password_hash text NOT NULL,
 tier text NOT NULL DEFAULT 'free' CHECK (tier IN ('free','premium')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash text PRIMARY KEY,
 account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
 last_activity timestamptz NOT NULL,
 expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_account ON sessions(account_id);
CREATE TABLE IF NOT EXISTS characters (
 id uuid PRIMARY KEY,
 account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
 name text NOT NULL,
 profession text NOT NULL CHECK (profession IN ('knight','archer','mage')),
 progress jsonb NOT NULL,
 lease_owner uuid,
 lease_session text,
 lease_until timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS character_name_unique ON characters(lower(name));
CREATE INDEX IF NOT EXISTS characters_account ON characters(account_id);
