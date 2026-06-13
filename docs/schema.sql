-- CIS Sovereign Electoral System - Database Schema
-- Run this in the Supabase SQL Editor

-- 1. Create Tables
CREATE TABLE IF NOT EXISTS public.classes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  population integer NOT NULL,
  votes_cast integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.positions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  order_index integer NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.candidates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  position_id uuid REFERENCES public.positions(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  photo_url text NOT NULL,
  votes integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.voter_tokens (
  id text PRIMARY KEY,
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  status text CHECK (status IN ('unused', 'used')) DEFAULT 'unused',
  used_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.system_config (
  id text PRIMARY KEY,
  is_open boolean DEFAULT false,
  opened_at timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. Initialize Election Status (Crucial to prevent 400 errors on update)
INSERT INTO public.system_config (id, is_open) 
VALUES ('election_status', false)
ON CONFLICT (id) DO NOTHING;

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voter_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies (Drop first to avoid "already exists" errors)
DO $$ 
BEGIN
    -- Classes
    DROP POLICY IF EXISTS "Full Access Classes" ON public.classes;
    CREATE POLICY "Full Access Classes" ON public.classes FOR ALL USING (true) WITH CHECK (true);

    -- Positions
    DROP POLICY IF EXISTS "Full Access Positions" ON public.positions;
    CREATE POLICY "Full Access Positions" ON public.positions FOR ALL USING (true) WITH CHECK (true);

    -- Candidates
    DROP POLICY IF EXISTS "Full Access Candidates" ON public.candidates;
    CREATE POLICY "Full Access Candidates" ON public.candidates FOR ALL USING (true) WITH CHECK (true);

    -- Tokens
    DROP POLICY IF EXISTS "Full Access Tokens" ON public.voter_tokens;
    CREATE POLICY "Full Access Tokens" ON public.voter_tokens FOR ALL USING (true) WITH CHECK (true);

    -- System Config
    DROP POLICY IF EXISTS "Full Access Config" ON public.system_config;
    CREATE POLICY "Full Access Config" ON public.system_config FOR ALL USING (true) WITH CHECK (true);
END $$;

-- 5. Enable Realtime
-- This section is safer to run manually if it fails, but we try to handle it.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'classes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.classes;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'candidates'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.candidates;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'system_config'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.system_config;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'voter_tokens'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.voter_tokens;
  END IF;
END $$;