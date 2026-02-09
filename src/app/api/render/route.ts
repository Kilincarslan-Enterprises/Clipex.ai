import { NextRequest, NextResponse } from 'next/server';
import { Template, Block, Asset } from '@/types';

export const runtime = process.env.CF_PAGES ? 'edge' : 'nodejs';

interface RenderRequest {
    template: Template;
    assets: Asset[];
    placeholders: Record<string, string | null>;
}

export async function POST(request: NextRequest) {
    if (process.env.CF_PAGES) {
        return NextResponse.json({ error: 'Rendering not supported on Edge' }, { status: 501 });
    }

    // Dynamic imports to avoid build errors on Edge
    const { join } = await import('path');
    const { v4: uuidv4 } = await import('uuid');
    const ffmpegModule = await import('fluent-ffmpeg');
    const ffmpeg = ffmpegModule.default;
    const ffmpegStaticModule = await import('ffmpeg-static');
    const ffmpegStatic = ffmpegStaticModule.default;

    if (ffmpegStatic) {
        ffmpeg.setFfmpegPath(ffmpegStatic);
    }

    try {
        const { template, assets, placeholders } = await request.json() as RenderRequest;

        // Resolve timeline blocks
        const activeBlocks = template.timeline.filter(b => b.duration > 0);
        activeBlocks.sort((a, b) => a.track - b.track); // Layer order: low track = bottom?
        // Usually higher track number = on top? Or lower track number = bottom?
        // Let's assume higher track index = higher z-index (on top).

        // 1. Inputs
        const command = ffmpeg();
        const inputMap = new Map<string, number>(); // assetId -> input index
        let inputIndex = 0;

        // We need to identify unique assets used
        const processedAssets = new Set<string>();

        // Helper to resolve source
        const resolveSourcePath = (source?: string) => {
            if (!source) return null;
            let assetId: string | null = null;

            // Check placeholder
            const match = source.match(/^{{(.+)}}$/);
            if (match) {
                assetId = placeholders[match[1]] || null;
            } else {
                return null;
            }

            if (assetId) {
                const asset = assets.find(a => a.id === assetId);
                if (asset) {
                    // Convert /uploads/foo.mp4 -> absolute path
                    // Remove leading / if present
                    const relativePath = asset.url.startsWith('/') ? asset.url.slice(1) : asset.url;
                    return join(process.cwd(), 'public', relativePath);
                }
            }
            return null;
        };

        // Add inputs
        // We only add inputs for video/image blocks
        for (const block of activeBlocks) {
            if (block.type === 'video' || block.type === 'image') {
                const path = resolveSourcePath(block.source);
                if (path && !processedAssets.has(block.id)) {
                    // Map path -> index
                    if (!inputMap.has(path)) {
                        command.input(path);
                        if (block.type === 'image') {
                            command.inputOption('-loop 1'); // Loop image
                        }
                        inputMap.set(path, inputIndex++);
                    }
                }
            }
        }

        // Filter complex
        // [0:v]...
        // Base layer: color source
        const duration = Math.max(...activeBlocks.map(b => b.start + b.duration));
        const width = template.canvas.width;
        const height = template.canvas.height;
        const fps = template.canvas.fps;

        command.input(`color=c=black:s=${width}x${height}:d=${duration}`)
            .inputFormat('lavfi');
        const baseInputIndex = inputIndex;
        inputIndex++;

        let currentStream = `[${baseInputIndex}:v]`; // Start with color

        // Process blocks
        const filters: string[] = [];

        // We need to chain overlays.
        activeBlocks.forEach((block, idx) => {
            const streamName = `layer${idx}`;

            if (block.type === 'video' || block.type === 'image') {
                const path = resolveSourcePath(block.source);
                if (path && inputMap.has(path)) {
                    const i = inputMap.get(path)!;
                    // Trim logic
                    const start = block.start;
                    const end = block.start + block.duration;
                    // x, y
                    const x = block.x || 0;
                    const y = block.y || 0;
                    const w = block.width || -1;
                    const h = block.height || -1;

                    let scaleFilter = '';
                    if (w > 0 || h > 0) {
                        scaleFilter = `,scale=${w > 0 ? w : -1}:${h > 0 ? h : -1}`;
                    }

                    // Prepare input stream
                    const trimmedLabel = `block${idx}`;

                    // PTS synchronization:
                    const ptsFilter = `setpts=PTS-STARTPTS+(${start}/TB)`;

                    const trimFilter = `[${i}:v]trim=duration=${block.duration},${ptsFilter}${scaleFilter}[${trimmedLabel}]`;

                    filters.push(trimFilter);

                    // Overlay
                    const overlayFilter = `${currentStream}[${trimmedLabel}]overlay=x=${x}:y=${y}:enable='between(t,${start},${end})'[${streamName}]`;
                    filters.push(overlayFilter);
                    currentStream = `[${streamName}]`;
                }
            }
            else if (block.type === 'text') {
                const text = block.text || '';
                const x = block.x || 0;
                const y = block.y || 0;
                const start = block.start;
                const end = block.start + block.duration;
                const fontSize = block.fontSize || 24;
                const fontColor = block.color || 'white';
                const bgColor = block.backgroundColor;

                // Simple escaping
                const escapedText = text.replace(/:/g, '\\:').replace(/'/g, "");

                // Font file logic for Windows
                let fontOption = '';
                if (process.platform === 'win32') {
                    // Try common path
                    fontOption = ':fontfile=C\\\\:/Windows/Fonts/arial.ttf';
                }

                let drawTextFilter = `${currentStream}drawtext=text='${escapedText}':x=${x}:y=${y}:fontsize=${fontSize}:fontcolor=${fontColor}:enable='between(t,${start},${end})'${fontOption}`;

                // Box
                if (bgColor) {
                    drawTextFilter += `:box=1:boxcolor=${bgColor}`;
                }

                drawTextFilter += `[${streamName}]`;
                filters.push(drawTextFilter);
                currentStream = `[${streamName}]`;
            }
        });

        // Output
        const outputFilename = `render_${uuidv4()}.mp4`;
        const outputPath = join(process.cwd(), 'public', 'renders', outputFilename);
        const publicUrl = `/renders/${outputFilename}`;

        // Execute
        await new Promise<void>((resolve, reject) => {
            command
                .complexFilter(filters)
                .map(currentStream) // Output the last stream
                .outputOptions([
                    '-c:v libx264',
                    '-pix_fmt yuv420p',
                    `-r ${fps}`,
                    '-preset fast'
                ])
                .output(outputPath)
                .on('end', () => resolve())
                .on('error', (err) => reject(err))
                .run();
        });

        return NextResponse.json({ url: publicUrl });

    } catch (error) {
        console.error("Render error:", error);
        return NextResponse.json(
            { error: "Render failed", details: (error as Error).message },
            { status: 500 }
        );
    }
}
