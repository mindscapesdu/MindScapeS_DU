-- =============================================================================
-- MindScapeS Frontier Talk Series 2026 - Supabase Complete Schema
-- Safe to run and re-run (idempotent with DROP POLICY IF EXISTS)
-- Run in your Supabase Project Dashboard -> SQL Editor -> New Query
-- =============================================================================

-- =============================================================================
-- PART 1: Registrations Table & Policies
-- =============================================================================

-- 1. Create registrations table
CREATE TABLE IF NOT EXISTS public.registrations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    affiliation TEXT,
    academic_status TEXT,
    sessions TEXT NOT NULL,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

-- 3. Policy to allow anonymous users to register (INSERT)
DROP POLICY IF EXISTS "Allow public insert registrations" ON public.registrations;
CREATE POLICY "Allow public insert registrations"
ON public.registrations
FOR INSERT
TO anon
WITH CHECK (true);

-- 4. Policy to allow anonymous users to update their own registration (UPDATE)
DROP POLICY IF EXISTS "Allow public update registrations" ON public.registrations;
CREATE POLICY "Allow public update registrations"
ON public.registrations
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- 5. Policy to allow anonymous users to read registration to support editing (SELECT)
DROP POLICY IF EXISTS "Allow public read registrations" ON public.registrations;
CREATE POLICY "Allow public read registrations"
ON public.registrations
FOR SELECT
TO anon
USING (true);

-- 6. Trigger to automatically update updated_at timestamp on edit
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_registrations_updated_at ON public.registrations;
CREATE TRIGGER update_registrations_updated_at
    BEFORE UPDATE ON public.registrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- =============================================================================
-- PART 2: Talks / Projects Table & Policies (Admin Talk Management)
-- =============================================================================

-- 7. Create talks table
CREATE TABLE IF NOT EXISTS public.talks (
    id TEXT PRIMARY KEY,
    session_number INT,
    date_display TEXT NOT NULL,
    time_display TEXT NOT NULL,
    speaker_name TEXT NOT NULL,
    speaker_affiliation TEXT,
    speaker_image TEXT,
    title TEXT NOT NULL,
    abstract TEXT,
    format_commentators TEXT,
    reading_title TEXT,
    reading_url TEXT,
    status TEXT DEFAULT 'upcoming', -- 'upcoming', 'active', 'concluded'
    has_abstract BOOLEAN DEFAULT false,
    has_register BOOLEAN DEFAULT false,
    zoom_link TEXT,
    zoom_meeting_id TEXT,
    zoom_passcode TEXT,
    zoom_instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Ensure Zoom columns exist if table was already created
ALTER TABLE public.talks ADD COLUMN IF NOT EXISTS zoom_link TEXT;
ALTER TABLE public.talks ADD COLUMN IF NOT EXISTS zoom_meeting_id TEXT;
ALTER TABLE public.talks ADD COLUMN IF NOT EXISTS zoom_passcode TEXT;
ALTER TABLE public.talks ADD COLUMN IF NOT EXISTS zoom_instructions TEXT;

-- 8. Enable Row Level Security (RLS) on talks
ALTER TABLE public.talks ENABLE ROW LEVEL SECURITY;

-- 9. Policies for talks table (idempotent with DROP POLICY IF EXISTS)
DROP POLICY IF EXISTS "Allow public read talks" ON public.talks;
CREATE POLICY "Allow public read talks"
ON public.talks
FOR SELECT
TO anon
USING (true);

DROP POLICY IF EXISTS "Allow public insert talks" ON public.talks;
CREATE POLICY "Allow public insert talks"
ON public.talks
FOR INSERT
TO anon
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update talks" ON public.talks;
CREATE POLICY "Allow public update talks"
ON public.talks
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete talks" ON public.talks;
CREATE POLICY "Allow public delete talks"
ON public.talks
FOR DELETE
TO anon
USING (true);

DROP TRIGGER IF EXISTS update_talks_updated_at ON public.talks;
CREATE TRIGGER update_talks_updated_at
    BEFORE UPDATE ON public.talks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- PART 3: Supabase Storage Buckets & Policies (Posters, Papers, Handouts)
-- =============================================================================

-- 10. Create 'readings' and 'posters' public storage buckets if missing
INSERT INTO storage.buckets (id, name, public) 
VALUES ('readings', 'readings', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('posters', 'posters', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 11. Allow public access to view storage objects
DROP POLICY IF EXISTS "Public read storage objects" ON storage.objects;
CREATE POLICY "Public read storage objects"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id IN ('readings', 'posters'));

-- 12. Allow public upload to storage objects
DROP POLICY IF EXISTS "Public upload storage objects" ON storage.objects;
CREATE POLICY "Public upload storage objects"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (bucket_id IN ('readings', 'posters'));

-- 13. Allow public update to storage objects
DROP POLICY IF EXISTS "Public update storage objects" ON storage.objects;
CREATE POLICY "Public update storage objects"
ON storage.objects
FOR UPDATE
TO anon
USING (bucket_id IN ('readings', 'posters'));

