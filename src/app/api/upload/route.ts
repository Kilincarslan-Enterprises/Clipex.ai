import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
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
        const filePath = join(uploadDir, filename);

        await writeFile(filePath, buffer);

        const publicUrl = `/uploads/${filename}`;

        return NextResponse.json({ url: publicUrl, filename });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
