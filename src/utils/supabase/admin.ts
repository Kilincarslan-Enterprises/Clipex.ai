import { createClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client with the service role key.
 * This bypasses RLS and should only be used in server-side code.
 */
export function createAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    );
}
