
-- 1. Create Tables
CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  population int NOT NULL,
  votes_cast int DEFAULT 0
);

CREATE TABLE IF NOT EXISTS positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  order_index int NOT NULL
);

CREATE TABLE IF NOT EXISTS candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id uuid REFERENCES positions(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  photo_url text NOT NULL,
  votes int DEFAULT 0
);

CREATE TABLE IF NOT EXISTS voter_tokens (
  id text PRIMARY KEY,
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('unused', 'used')),
  used_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS system_config (
  id text PRIMARY KEY,
  is_open boolean DEFAULT false,
  opened_at timestamp with time zone
);

-- 2. Add column if it was missed in a previous run
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='system_config' AND column_name='opened_at') THEN
    ALTER TABLE system_config ADD COLUMN opened_at timestamp with time zone;
  END IF;
END $$;

-- 3. Seed initial config
INSERT INTO system_config (id, is_open, opened_at)
VALUES ('election_status', false, NULL)
ON CONFLICT (id) DO NOTHING;

-- 4. Enable Realtime
-- Note: This might fail if the publication already has the tables. We wrap it in a safe way.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'system_config') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE classes, candidates, positions, system_config, voter_tokens;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Handle case where some tables might already be in publication
  NULL;
END $$;

-- 5. RLS Policies
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE voter_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Drop existing if they exist to avoid "already exists" errors
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Allow All" ON classes;
    DROP POLICY IF EXISTS "Allow All" ON positions;
    DROP POLICY IF EXISTS "Allow All" ON candidates;
    DROP POLICY IF EXISTS "Allow All" ON voter_tokens;
    DROP POLICY IF EXISTS "Allow All" ON system_config;
END $$;

CREATE POLICY "Allow All" ON classes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All" ON positions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All" ON candidates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All" ON voter_tokens FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All" ON system_config FOR ALL USING (true) WITH CHECK (true);
