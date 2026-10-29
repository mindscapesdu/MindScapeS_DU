-- =============================================================================
-- MindScapeS Frontier Talk Series 2026 - Supabase Registrations Table Schema
-- Run this query in your Supabase Project Dashboard -> SQL Editor -> New Query
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
CREATE POLICY "Allow public insert registrations"
ON public.registrations
FOR INSERT
TO anon
WITH CHECK (true);

-- 4. Policy to allow anonymous users to update their own registration (UPDATE)
CREATE POLICY "Allow public update registrations"
ON public.registrations
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- 5. Policy to allow anonymous users to read registration to support editing (SELECT)
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
