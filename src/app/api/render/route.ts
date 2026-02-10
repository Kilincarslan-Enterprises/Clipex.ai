import { NextResponse } from 'next/server';

export const runtime = 'edge'; // Optional: Use edge if appropriate, or nodejs

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // Forward to Render Service
        // Assuming Render Service is on port 3001 locally or defined in ENV
        const RENDER_SERVICE_URL = process.env.RENDER_SERVICE_URL || 'http://localhost:3001';

        const response = await fetch(`${RENDER_SERVICE_URL}/render`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json({ error: 'Render service failed', details: errorText }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Proxy error:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
