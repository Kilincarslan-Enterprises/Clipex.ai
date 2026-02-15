import { NextResponse } from 'next/server';
import { RENDER_SERVICE_URL } from '@/lib/render-config';

export const runtime = 'edge';

export async function GET() {

    const start = Date.now();

    try {
        const response = await fetch(`${RENDER_SERVICE_URL}/health`, {
            method: 'GET',
            headers: {
                'User-Agent': 'Clipex-Frontend/1.0',
            },
            signal: AbortSignal.timeout(10000), // 10s timeout
        });

        const latency = Date.now() - start;

        if (!response.ok) {
            return NextResponse.json({
                connected: false,
                renderServiceUrl: RENDER_SERVICE_URL.replace(/\/\/.*@/, '//***@'), // Mask credentials
                status: response.status,
                statusText: response.statusText,
                latency,
                error: `Render service returned HTTP ${response.status}`,
            }, { status: 502 });
        }

        const data = await response.json();
        return NextResponse.json({
            connected: true,
            renderServiceUrl: RENDER_SERVICE_URL.replace(/\/\/.*@/, '//***@'),
            latency,
            renderService: data,
        });

    } catch (error: any) {
        const latency = Date.now() - start;
        return NextResponse.json({
            connected: false,
            renderServiceUrl: RENDER_SERVICE_URL.replace(/\/\/.*@/, '//***@'),
            latency,
            error: error.message || 'Connection failed',
        }, { status: 502 });
    }
}
