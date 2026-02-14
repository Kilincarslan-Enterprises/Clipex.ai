import { NextResponse } from 'next/server';

export const runtime = 'edge'; // Cloudflare Pages requires edge runtime

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // Forward to Render Service
        const RENDER_SERVICE_URL = process.env.RENDER_SERVICE_URL || 'http://localhost:3001';

        console.log(`Forwarding render request to: ${RENDER_SERVICE_URL}/render`);

        const response = await fetch(`${RENDER_SERVICE_URL}/render`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Explicitly not forwarding all headers to avoid 403/CSRF issues from destination
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
