import { NextResponse } from 'next/server';

export const runtime = 'nodejs'; // Use Node.js runtime for handling FormData/files more reliably

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const RENDER_SERVICE_URL = process.env.RENDER_SERVICE_URL || 'http://localhost:3001';

        // Forwarding to the render service
        const proxyFormData = new FormData();
        proxyFormData.append('file', file);

        const response = await fetch(`${RENDER_SERVICE_URL}/upload`, {
            method: 'POST',
            body: proxyFormData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Render service upload failed:', errorText);
            return NextResponse.json({ error: 'Upload to render service failed', details: errorText }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Upload proxy error:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
