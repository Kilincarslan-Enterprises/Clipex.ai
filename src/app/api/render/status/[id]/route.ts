import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const RENDER_SERVICE_URL = process.env.RENDER_SERVICE_URL || 'http://localhost:3001';

        const response = await fetch(`${RENDER_SERVICE_URL}/status/${id}`);

        if (!response.ok) {
            return NextResponse.json({ error: 'Status check failed' }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
