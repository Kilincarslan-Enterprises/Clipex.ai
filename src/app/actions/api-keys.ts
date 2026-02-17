'use server';

import { createClient } from '@/utils/supabase/server';

/**
 * Generate a new API key for the current user.
 * Returns the raw key (only shown once).
 */
export async function createApiKey(name: string): Promise<{ key: string; id: string } | { error: string }> {
    try {
        // Use absolute URL for server-side fetch
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        const response = await fetch(`${baseUrl}/api/api-keys`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name }),
        });

        if (!response.ok) {
            return { error: 'Failed to create API key' };
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Create API key error:', error);
        return { error: 'Failed to create API key' };
    }
}

/**
 * List all API keys for the current user (prefix only, not full key).
 */
export async function listApiKeys() {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        const response = await fetch(`${baseUrl}/api/api-keys`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            return [];
        }

        const data = await response.json();
        return data.keys || [];
    } catch (error) {
        console.error('List API keys error:', error);
        return [];
    }
}

/**
 * Revoke (delete) an API key.
 */
export async function revokeApiKey(keyId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        const response = await fetch(`${baseUrl}/api/api-keys?id=${keyId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            return { success: false, error: 'Failed to revoke key' };
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Revoke API key error:', error);
        return { success: false, error: 'Failed to revoke key' };
    }
}
