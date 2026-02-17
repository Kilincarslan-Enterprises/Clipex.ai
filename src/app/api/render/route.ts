import { NextResponse } from 'next/server';
import { RENDER_SERVICE_URL } from '@/lib/render-config';

export const runtime = 'edge'; // Cloudflare Pages requires edge runtime

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const RENDER_ACCESS_TOKEN = process.env.RENDER_ACCESS_TOKEN || '';

        console.log(`Forwarding render request to: ${RENDER_SERVICE_URL}/render`);

        const response = await fetch(`${RENDER_SERVICE_URL}/render`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Clipex-Frontend/1.0',
                ...(RENDER_ACCESS_TOKEN ? { 'X-Render-Access-Token': RENDER_ACCESS_TOKEN } : {}),
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Render service failed with status ${response.status}:`, errorText);
            return NextResponse.json({ error: 'Render service failed', details: errorText }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Proxy error:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
