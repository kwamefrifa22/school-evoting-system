-- CIS Sovereign Election System - Idempotent Supabase/PostgreSQL Schema

-- 1. Classes Table
CREATE TABLE IF NOT EXISTS classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    population INTEGER NOT NULL DEFAULT 0,
    votes_cast INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Electoral Positions Table
CREATE TABLE IF NOT EXISTS positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Candidates Table
CREATE TABLE IF NOT EXISTS candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    position_id UUID REFERENCES positions(id) ON DELETE CASCADE NOT NULL,
    full_name TEXT NOT NULL,
    photo_url TEXT NOT NULL,
    votes INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Voter Tokens Table
CREATE TABLE IF NOT EXISTS voter_tokens (
    id TEXT PRIMARY KEY, -- 6-character unique code
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
    status TEXT CHECK (status IN ('unused', 'used')) NOT NULL DEFAULT 'unused',
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. System Config Table
CREATE TABLE IF NOT EXISTS system_config (
    id TEXT PRIMARY KEY,
    is_open BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default config if not exists
INSERT INTO system_config (id, is_open) 
VALUES ('election_status', false) 
ON CONFLICT (id) DO NOTHING;

-- Enable Realtime (Idempotent check)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'classes'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE classes;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'positions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE positions;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'candidates'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE candidates;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'voter_tokens'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE voter_tokens;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'system_config'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE system_config;
    END IF;
END $$;

-- Security Rules (Row Level Security)
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE voter_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Allow full public access for the prototype (In production, you'd restrict INSERT/UPDATE to authenticated admins)
DROP POLICY IF EXISTS "Public full access" ON classes;
CREATE POLICY "Public full access" ON classes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access" ON positions;
CREATE POLICY "Public full access" ON positions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access" ON candidates;
CREATE POLICY "Public full access" ON candidates FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access" ON voter_tokens;
CREATE POLICY "Public full access" ON voter_tokens FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access" ON system_config;
CREATE POLICY "Public full access" ON system_config FOR ALL USING (true) WITH CHECK (true);