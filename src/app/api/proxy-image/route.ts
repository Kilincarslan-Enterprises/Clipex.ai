import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * SECURE IMAGE PROXY
 * - Bypasses CORS by fetching images/videos server-side.
 * - Restricts content-type to image/* or video/*.
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
        return new NextResponse('Missing URL', { status: 400 });
    }

    try {
        // Validate URL format
        new URL(url);

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Clipex-Proxy/1.0',
            },
        });

        if (!response.ok) {
            return new NextResponse(`Failed to fetch: ${response.statusText}`, { status: response.status });
        }

        const contentType = response.headers.get('content-type') || '';

        // SECURITY: Only allow images and videos
        if (!contentType.startsWith('image/') && !contentType.startsWith('video/')) {
            return new NextResponse('Forbidden content type', { status: 403 });
        }

        // Stream the response back to the client
        const headers = new Headers();
        headers.set('Content-Type', contentType);
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('Cache-Control', 'public, max-age=3600');

        return new NextResponse(response.body, {
            status: 200,
            headers,
        });
    } catch (error: any) {
        console.error('Proxy error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
