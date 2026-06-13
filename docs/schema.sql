
-- CIS Sovereign Election System - Supabase/PostgreSQL Schema

-- 1. Classes Table
CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    population INTEGER NOT NULL DEFAULT 0,
    votes_cast INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Electoral Positions Table
CREATE TABLE positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Candidates Table
CREATE TABLE candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    position_id UUID REFERENCES positions(id) ON DELETE CASCADE NOT NULL,
    full_name TEXT NOT NULL,
    photo_url TEXT NOT NULL,
    votes INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Voter Tokens Table
CREATE TABLE voter_tokens (
    id TEXT PRIMARY KEY, -- Unique code (e.g., A1-123456)
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
    status TEXT CHECK (status IN ('unused', 'used')) NOT NULL DEFAULT 'unused',
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. System Config Table
CREATE TABLE system_config (
    id TEXT PRIMARY KEY,
    is_open BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert initial status
INSERT INTO system_config (id, is_open) VALUES ('election_status', false);

-- Enable Realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE classes;
ALTER PUBLICATION supabase_realtime ADD TABLE positions;
ALTER PUBLICATION supabase_realtime ADD TABLE candidates;
ALTER PUBLICATION supabase_realtime ADD TABLE voter_tokens;
ALTER PUBLICATION supabase_realtime ADD TABLE system_config;

-- Security Rules (Row Level Security)
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE voter_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Public read access" ON classes FOR SELECT USING (true);
CREATE POLICY "Public read access" ON positions FOR SELECT USING (true);
CREATE POLICY "Public read access" ON candidates FOR SELECT USING (true);
CREATE POLICY "Public read access" ON voter_tokens FOR SELECT USING (true);
CREATE POLICY "Public read access" ON system_config FOR SELECT USING (true);

-- Allow public insert for candidates and tokens for admin (simplified for prototype)
CREATE POLICY "Public full access" ON classes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access" ON positions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access" ON candidates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access" ON voter_tokens FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access" ON system_config FOR ALL USING (true) WITH CHECK (true);
