
-- Enable Realtime for the database
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- 1. Classes Table
CREATE TABLE IF NOT EXISTS public.classes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    population int DEFAULT 0,
    votes_cast int DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- 2. Positions Table
CREATE TABLE IF NOT EXISTS public.positions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    order_index int DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- 3. Candidates Table
CREATE TABLE IF NOT EXISTS public.candidates (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    position_id uuid REFERENCES public.positions(id) ON DELETE CASCADE,
    full_name text NOT NULL,
    photo_url text,
    votes int DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- 4. Voter Tokens Table
CREATE TABLE IF NOT EXISTS public.voter_tokens (
    id text PRIMARY KEY,
    class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
    status text DEFAULT 'unused',
    used_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- 5. System Config Table
CREATE TABLE IF NOT EXISTS public.system_config (
    id text PRIMARY KEY,
    is_open boolean DEFAULT false,
    opened_at timestamptz
);

-- Seed System Config if it doesn't exist
INSERT INTO public.system_config (id, is_open) 
VALUES ('election_status', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voter_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Idempotent Policy Creation
DO $$ 
BEGIN
    -- Classes Policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Full Access Classes') THEN
        CREATE POLICY "Full Access Classes" ON public.classes FOR ALL USING (true) WITH CHECK (true);
    END IF;
    
    -- Positions Policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Full Access Positions') THEN
        CREATE POLICY "Full Access Positions" ON public.positions FOR ALL USING (true) WITH CHECK (true);
    END IF;
    
    -- Candidates Policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Full Access Candidates') THEN
        CREATE POLICY "Full Access Candidates" ON public.candidates FOR ALL USING (true) WITH CHECK (true);
    END IF;
    
    -- Tokens Policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Full Access Tokens') THEN
        CREATE POLICY "Full Access Tokens" ON public.voter_tokens FOR ALL USING (true) WITH CHECK (true);
    END IF;
    
    -- Config Policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Full Access Config') THEN
        CREATE POLICY "Full Access Config" ON public.system_config FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Enable Realtime for specific tables
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'classes') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.classes;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'candidates') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.candidates;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'positions') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.positions;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'system_config') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.system_config;
    END IF;
END $$;
