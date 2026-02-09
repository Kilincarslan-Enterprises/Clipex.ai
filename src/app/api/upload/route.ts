import { NextRequest, NextResponse } from 'next/server';

export const runtime = process.env.CF_PAGES ? 'edge' : 'nodejs';

export async function POST(request: NextRequest) {
    if (process.env.CF_PAGES) {
        return NextResponse.json({ error: 'Upload not supported on Edge' }, { status: 501 });
    }

    const { writeFile } = await import('fs/promises');
    const { join } = await import('path');
    const { v4: uuidv4 } = await import('uuid');

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Create unique filename
        const originalName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
        const filename = `${uuidv4()}_${originalName}`;
        const uploadDir = join(process.cwd(), 'public', 'uploads');
        // Check if uploadDir exists (it should via Dockerfile/local)
        const filePath = join(uploadDir, filename);

        await writeFile(filePath, buffer);

        const publicUrl = `/uploads/${filename}`;

        return NextResponse.json({ url: publicUrl, filename });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
