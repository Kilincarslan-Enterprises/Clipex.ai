'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * Generate a new API key for the current user.
 * Returns the raw key (only shown once).
 */
export async function createApiKey(name: string): Promise<{ key: string; id: string } | { error: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Not authenticated' };
    }

    // Generate a random key: ck_<random_hex>
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    const rawKey = 'ck_' + Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const keyPrefix = rawKey.substring(0, 11); // "ck_" + first 8 hex chars

    // Hash it
    const encoder = new TextEncoder();
    const data = encoder.encode(rawKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const keyHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    // Store in DB (use admin client to bypass RLS for insert with user_id)
    const admin = createAdminClient();
    const { data: row, error } = await admin
        .from('api_keys')
        .insert({
            user_id: user.id,
            name: name || 'Default Key',
            key_prefix: keyPrefix,
            key_hash: keyHash,
        })
        .select('id')
        .single();

    if (error) {
        console.error('Create API key error:', error);
        return { error: 'Failed to create API key' };
    }

    return { key: rawKey, id: row.id };
}

/**
 * List all API keys for the current user (prefix only, not full key).
 */
export async function listApiKeys() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabase
        .from('api_keys')
        .select('id, name, key_prefix, created_at, last_used_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('List API keys error:', error);
        return [];
    }

    return data || [];
}

/**
 * Revoke (delete) an API key.
 */
export async function revokeApiKey(keyId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', keyId)
        .eq('user_id', user.id); // ensure ownership

    if (error) {
        console.error('Revoke API key error:', error);
        return { success: false, error: 'Failed to revoke key' };
    }

    return { success: true };
}
