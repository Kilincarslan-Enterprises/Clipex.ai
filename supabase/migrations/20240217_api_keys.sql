-- ══════════════════════════════════════════════════════════
-- API Keys table for Public Render API authentication
-- ══════════════════════════════════════════════════════════
CREATE TABLE public.api_keys (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL DEFAULT 'Default Key',
  key_prefix text NOT NULL,       -- first 8 chars of key, for display (e.g. "ck_abc123...")
  key_hash text NOT NULL,          -- SHA-256 hash of the full key
  last_used_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Users can only see their own keys
CREATE POLICY "Users can view own api_keys"
ON public.api_keys FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own keys
CREATE POLICY "Users can create own api_keys"
ON public.api_keys FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own keys
CREATE POLICY "Users can delete own api_keys"
ON public.api_keys FOR DELETE
USING (auth.uid() = user_id);

-- Index for fast lookup by hash during API authentication
CREATE INDEX idx_api_keys_key_hash ON public.api_keys (key_hash);
