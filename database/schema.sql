CREATE TABLE IF NOT EXISTS users (
 id UUID PRIMARY KEY,
 email TEXT NOT NULL UNIQUE,
 display_name TEXT NOT NULL,
 password_hash TEXT NOT NULL,
 role TEXT NOT NULL DEFAULT 'developer' CHECK (role IN ('developer','admin')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS apps (
 id UUID PRIMARY KEY,
 developer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 name TEXT NOT NULL,
 package_id TEXT NOT NULL,
 description TEXT NOT NULL,
 category TEXT NOT NULL,
 version TEXT NOT NULL,
 min_android TEXT NOT NULL DEFAULT '8.0',
 package_filename TEXT NOT NULL,
 package_sha256 TEXT NOT NULL,
 package_size BIGINT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','published','rejected','suspended')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE (developer_id, package_id)
);
CREATE INDEX IF NOT EXISTS apps_public_search_idx ON apps(status, category, updated_at DESC);
CREATE INDEX IF NOT EXISTS apps_developer_idx ON apps(developer_id, created_at DESC);
