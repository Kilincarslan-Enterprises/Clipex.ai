import { NextResponse } from 'next/server';
import { RENDER_SERVICE_URL } from '@/lib/render-config';

export const runtime = 'edge'; // Cloudflare Pages requires edge runtime

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        console.log(`Checking render status for jobId: ${id} at ${RENDER_SERVICE_URL}/status/${id}`);

        const response = await fetch(`${RENDER_SERVICE_URL}/status/${id}`);

        if (!response.ok) {
            console.error(`Status check failed for jobId ${id} with status ${response.status}`);
            return NextResponse.json({ error: 'Status check failed' }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Status proxy error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
