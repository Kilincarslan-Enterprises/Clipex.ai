import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const runtime = 'edge';

/**
 * POST /api/v1/render
 * 
 * Public authenticated render endpoint.
 * 
 * Headers:
 *   x-api-key: <api_key>
 * 
 * Body:
 * {
 *   "template_id": "uuid",
 *   "modifications": {
 *     "image_1.source": "https://...",
 *     "image_1.duration": 5
 *   },
 *   "elements": [{ ...block }]  // optional: new elements to inject
 * }
 */
export async function POST(req: Request) {
    try {
        // ── 1. Authenticate via x-api-key ──
        const apiKey = req.headers.get('x-api-key');
        if (!apiKey) {
            return NextResponse.json(
                { error: 'Missing x-api-key header' },
                { status: 401 }
            );
        }

        const supabase = createAdminClient();

        // Hash the key for lookup
        const keyHash = await hashKey(apiKey);

        const { data: keyRow, error: keyError } = await supabase
            .from('api_keys')
            .select('id, user_id')
            .eq('key_hash', keyHash)
            .single();

        if (keyError || !keyRow) {
            return NextResponse.json(
                { error: 'Invalid API key' },
                { status: 401 }
            );
        }

        // Update last_used_at
        supabase
            .from('api_keys')
            .update({ last_used_at: new Date().toISOString() })
            .eq('id', keyRow.id)
            .then(() => { }); // fire-and-forget

        // ── 2. Parse request body ──
        const body = await req.json();
        const { template_id, modifications, elements } = body;

        if (!template_id) {
            return NextResponse.json(
                { error: 'Missing template_id in request body' },
                { status: 400 }
            );
        }

        // ── 3. Load template from database ──
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('id, data, user_id')
            .eq('id', template_id)
            .single();

        if (projectError || !project) {
            return NextResponse.json(
                { error: 'Template not found', template_id },
                { status: 404 }
            );
        }

        // Verify ownership: the API key's user must own the template
        if (project.user_id && project.user_id !== keyRow.user_id) {
            return NextResponse.json(
                { error: 'You do not have access to this template' },
                { status: 403 }
            );
        }

        const templateData = project.data as any;
        if (!templateData || !templateData.canvas || !Array.isArray(templateData.timeline)) {
            return NextResponse.json(
                { error: 'Template data is invalid or empty' },
                { status: 400 }
            );
        }

        // ── 4. Apply modifications ──
        // modifications is an object like { "image_1.source": "https://...", "image_1.duration": 5 }
        const timeline = [...templateData.timeline];

        if (modifications && typeof modifications === 'object') {
            for (const [key, value] of Object.entries(modifications)) {
                const dotIndex = key.indexOf('.');
                if (dotIndex === -1) {
                    return NextResponse.json(
                        { error: `Invalid modification key "${key}". Expected format: "dynamicId.property"` },
                        { status: 400 }
                    );
                }

                const dynId = key.substring(0, dotIndex);
                const prop = key.substring(dotIndex + 1);

                const blockIndex = timeline.findIndex((b: any) => b.dynamicId === dynId);
                if (blockIndex === -1) {
                    return NextResponse.json(
                        { error: `No block found with dynamicId "${dynId}"` },
                        { status: 400 }
                    );
                }

                // Check that the property is actually marked as dynamic
                const block = timeline[blockIndex];
                if (block.dynamicFields && Array.isArray(block.dynamicFields)) {
                    if (!block.dynamicFields.includes(prop)) {
                        return NextResponse.json(
                            { error: `Property "${prop}" on block "${dynId}" is not marked as dynamic. Dynamic fields: [${block.dynamicFields.join(', ')}]` },
                            { status: 400 }
                        );
                    }
                }

                // Apply the modification
                timeline[blockIndex] = { ...timeline[blockIndex], [prop]: value };
            }
        }

        // ── 5. Inject elements ──
        if (elements && Array.isArray(elements)) {
            for (const el of elements) {
                if (!el.type || el.duration === undefined) {
                    return NextResponse.json(
                        { error: 'Each element in "elements" must have at least "type" and "duration"' },
                        { status: 400 }
                    );
                }
                // Generate ID if not provided
                if (!el.id) {
                    el.id = crypto.randomUUID();
                }
                timeline.push(el);
            }
        }

        // ── 6. Build final template & proxy to render service ──
        const finalTemplate = {
            canvas: templateData.canvas,
            timeline,
        };

        const RENDER_SERVICE_URL =
            process.env.RENDER_SERVICE_URL ||
            process.env.NEXT_PUBLIC_RENDER_API_URL ||
            'http://localhost:3001';

        const renderPayload = {
            template: finalTemplate,
            assets: templateData.assets || [],
            placeholders: templateData.placeholders || {},
            userId: keyRow.user_id,
            templateId: template_id,
            projectId: template_id,
            source: 'api',
        };

        const renderResponse = await fetch(`${RENDER_SERVICE_URL}/render`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Clipex-API/1.0',
            },
            body: JSON.stringify(renderPayload),
        });

        if (!renderResponse.ok) {
            const errorText = await renderResponse.text();
            return NextResponse.json(
                { error: 'Render service failed', details: errorText },
                { status: renderResponse.status }
            );
        }

        const renderData = await renderResponse.json();

        // Return job info + status polling URL
        return NextResponse.json({
            jobId: renderData.jobId,
            statusUrl: `${RENDER_SERVICE_URL}/status/${renderData.jobId}`,
            message: 'Render job started successfully',
        });
    } catch (error: any) {
        console.error('API v1 render error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', details: error.message },
            { status: 500 }
        );
    }
}

/**
 * Hash an API key using SHA-256 (Web Crypto API, Edge-compatible)
 */
async function hashKey(key: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
