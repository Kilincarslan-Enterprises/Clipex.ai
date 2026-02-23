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
 *     "image_1.duration": 5,
 *     "template.duration": 30
 *   },
 *   "elements": [{ ...block }]
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

        // Update last_used_at (fire-and-forget)
        supabase
            .from('api_keys')
            .update({ last_used_at: new Date().toISOString() })
            .eq('id', keyRow.id)
            .then(() => { });

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

        // Verify ownership
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
        const timeline = [...templateData.timeline];
        const canvas = { ...templateData.canvas };
        const templateDynamic = templateData.dynamic || {};

        if (modifications && typeof modifications === 'object') {
            // ── Collect dynamic array expansions (processed after normal mods) ──
            const arrayExpansions: { blockIndex: number; prop: string; values: any[] }[] = [];

            for (const [key, value] of Object.entries(modifications)) {
                const dotIndex = key.indexOf('.');
                if (dotIndex === -1) {
                    return NextResponse.json(
                        { error: `Invalid modification key "${key}". Expected format: "dynamicId.property" or "template.property"` },
                        { status: 400 }
                    );
                }

                const target = key.substring(0, dotIndex);
                const prop = key.substring(dotIndex + 1);

                // ── Template-level modifications (e.g. template.duration) ──
                if (target === 'template') {
                    const templateFields = templateDynamic.dynamicFields || [];
                    if (templateFields.length > 0 && !templateFields.includes(prop)) {
                        return NextResponse.json(
                            { error: `Property "${prop}" on template is not marked as dynamic. Dynamic fields: [${templateFields.join(', ')}]` },
                            { status: 400 }
                        );
                    }
                    // Coerce numeric canvas properties (duration, width, height, fps)
                    const numericCanvasFields = ['duration', 'width', 'height', 'fps'];
                    if (numericCanvasFields.includes(prop)) {
                        const numVal = Number(value);
                        if (isNaN(numVal)) {
                            return NextResponse.json(
                                { error: `Property "template.${prop}" must be a number, got "${value}"` },
                                { status: 400 }
                            );
                        }
                        canvas[prop] = numVal;
                    } else {
                        canvas[prop] = value;
                    }
                    continue;
                }

                // ── Block-level modifications ──
                const blockIndex = timeline.findIndex((b: any) => b.dynamicId === target);
                if (blockIndex === -1) {
                    return NextResponse.json(
                        { error: `No block found with dynamicId "${target}"` },
                        { status: 400 }
                    );
                }

                // Validate against dynamicFields
                const block = timeline[blockIndex];
                if (block.dynamicFields && Array.isArray(block.dynamicFields)) {
                    if (!block.dynamicFields.includes(prop)) {
                        return NextResponse.json(
                            { error: `Property "${prop}" on block "${target}" is not marked as dynamic. Dynamic fields: [${block.dynamicFields.join(', ')}]` },
                            { status: 400 }
                        );
                    }
                }

                // ── Dynamic Array: value is an array → queue expansion ──
                if (Array.isArray(value) && block.isDynamicArray) {
                    arrayExpansions.push({ blockIndex, prop, values: value });
                    continue;
                }

                // Apply modification — coerce numeric properties
                const numericBlockFields = ['duration', 'start', 'track', 'x', 'y', 'fontSize', 'volume'];
                let finalValue = value;
                if (numericBlockFields.includes(prop) && typeof value !== 'number') {
                    const numVal = Number(value);
                    if (isNaN(numVal)) {
                        return NextResponse.json(
                            { error: `Property "${prop}" on block "${target}" must be a number, got "${value}"` },
                            { status: 400 }
                        );
                    }
                    finalValue = numVal;
                }
                timeline[blockIndex] = { ...timeline[blockIndex], [prop]: finalValue };
            }

            // ── Process dynamic array expansions ──
            // Sort by descending blockIndex so splicing doesn't shift earlier indices
            arrayExpansions.sort((a, b) => b.blockIndex - a.blockIndex);

            for (const expansion of arrayExpansions) {
                const templateBlock = timeline[expansion.blockIndex];
                const count = expansion.values.length;
                if (count === 0) continue;

                const config = templateBlock.dynamicArrayConfig || { durationMode: 'fixed_per_item' };
                const originalDuration = templateBlock.duration || canvas.duration || 5;
                const originalStart = templateBlock.start || 0;

                // Calculate per-item duration based on mode
                let itemDuration: number;
                if (config.durationMode === 'divide_total') {
                    // The original block duration is the total for all items
                    itemDuration = originalDuration / count;
                } else {
                    // 'fixed_per_item' (default): each item gets the full original duration
                    itemDuration = originalDuration;
                }

                // Total duration of the expanded array
                const totalArrayDuration = itemDuration * count;

                // How much extra time the expansion adds compared to the original single block
                const extraTime = totalArrayDuration - originalDuration;

                // Build cloned blocks
                const clonedBlocks: any[] = [];
                for (let i = 0; i < count; i++) {
                    const clone = {
                        ...JSON.parse(JSON.stringify(templateBlock)),
                        id: `${templateBlock.id}_arr_${i}`,
                        start: originalStart + (i * itemDuration),
                        duration: itemDuration,
                        [expansion.prop]: expansion.values[i],
                        // Remove array config from clones (not needed at render time)
                        isDynamicArray: undefined,
                        dynamicArrayConfig: undefined,
                    };
                    // Adjust animation times: they are relative to block start, so they stay the same
                    clonedBlocks.push(clone);
                }

                // Replace the original block with the cloned blocks
                timeline.splice(expansion.blockIndex, 1, ...clonedBlocks);

                // Shift subsequent blocks on the same track forward by extraTime
                if (extraTime > 0) {
                    const track = templateBlock.track;
                    // The cloned blocks now occupy indices [expansion.blockIndex .. expansion.blockIndex + count - 1]
                    // Blocks after them in the array that are on the same track and start after the original block should be shifted
                    const afterIndex = expansion.blockIndex + count;
                    for (let i = afterIndex; i < timeline.length; i++) {
                        const b = timeline[i];
                        if (b.track === track && (b.start || 0) >= originalStart + originalDuration) {
                            timeline[i] = { ...b, start: (b.start || 0) + extraTime };
                        }
                    }
                }
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
                if (!el.id) {
                    el.id = crypto.randomUUID();
                }
                timeline.push(el);
            }
        }

        // ── 6. Build final template & proxy to render service ──
        const finalTemplate = {
            canvas,
            timeline,
        };

        const RENDER_SERVICE_URL =
            process.env.RENDER_SERVICE_URL ||
            process.env.NEXT_PUBLIC_RENDER_API_URL ||
            'http://localhost:3001';

        const RENDER_ACCESS_TOKEN = process.env.RENDER_ACCESS_TOKEN || '';

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
                ...(RENDER_ACCESS_TOKEN ? { 'X-Render-Access-Token': RENDER_ACCESS_TOKEN } : {}),
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
