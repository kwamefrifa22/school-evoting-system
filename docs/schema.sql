
-- CIS Sovereign Election System Schema
-- For use with PostgreSQL / Supabase

CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  population INTEGER NOT NULL DEFAULT 0,
  votes_cast INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id UUID REFERENCES positions(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  photo_url TEXT,
  votes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE voter_tokens (
  id TEXT PRIMARY KEY, -- 6-character code
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('unused', 'used')) DEFAULT 'unused',
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_tokens_status ON voter_tokens(status);
CREATE INDEX idx_candidates_position ON candidates(position_id);
