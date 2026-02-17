import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { randomBytes, createHash } from 'node:crypto';

/**
 * GET /api/api-keys - List all API keys for the current user
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const { data, error } = await supabase
            .from('api_keys')
            .select('id, name, key_prefix, created_at, last_used_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('List API keys error:', error);
            return NextResponse.json({ error: 'Failed to list API keys' }, { status: 500 });
        }

        return NextResponse.json({ keys: data || [] });
    } catch (error) {
        console.error('Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * POST /api/api-keys - Create a new API key
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const body = await request.json();
        const name = body.name || 'Default Key';

        // Generate a random key: ck_<random_hex>
        const rawKey = 'ck_' + randomBytes(32).toString('hex');
        const keyPrefix = rawKey.substring(0, 11); // "ck_" + first 8 hex chars

        // Hash with node:crypto
        const keyHash = createHash('sha256').update(rawKey).digest('hex');

        // Store in DB (use admin client to bypass RLS for insert with user_id)
        const admin = createAdminClient();
        const { data: row, error } = await admin
            .from('api_keys')
            .insert({
                user_id: user.id,
                name: name,
                key_prefix: keyPrefix,
                key_hash: keyHash,
            })
            .select('id')
            .single();

        if (error) {
            console.error('Create API key error:', error);
            return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
        }

        return NextResponse.json({ key: rawKey, id: row.id });
    } catch (error) {
        console.error('Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * DELETE /api/api-keys - Revoke (delete) an API key
 */
export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const keyId = searchParams.get('id');

        if (!keyId) {
            return NextResponse.json({ error: 'Missing key ID' }, { status: 400 });
        }

        const { error } = await supabase
            .from('api_keys')
            .delete()
            .eq('id', keyId)
            .eq('user_id', user.id); // ensure ownership

        if (error) {
            console.error('Revoke API key error:', error);
            return NextResponse.json({ error: 'Failed to revoke key' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
