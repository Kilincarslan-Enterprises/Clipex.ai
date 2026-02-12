import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const RENDER_SERVICE_URL = process.env.RENDER_SERVICE_URL || 'http://localhost:3001';

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
