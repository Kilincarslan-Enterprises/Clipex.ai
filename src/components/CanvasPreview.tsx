'use client';

import { useStore } from '@/lib/store';
import { Block } from '@/types';
import { useEffect, useRef } from 'react';

export function CanvasPreview() {
    const { template, currentTime, placeholders, assets, isPlaying, setCurrentTime } = useStore();
    const canvasRef = useRef<HTMLDivElement>(null);

    // Simple playback loop
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isPlaying) {
            const startTime = performance.now();
            const startCurrentTime = currentTime;

            interval = setInterval(() => {
                const elapsed = (performance.now() - startTime) / 1000;
                setCurrentTime(startCurrentTime + elapsed);
            }, 1000 / template.canvas.fps);
        }
        return () => clearInterval(interval);
    }, [isPlaying, template.canvas.fps]); // removed currentTime dependency to avoid loop drift/re-render spam


    const resolveSource = (source?: string) => {
        if (!source) return null;

        // Check for placeholder
        const match = source.match(/^{{(.+)}}$/);
        if (match) {
            const placeholderName = match[1]; // e.g., video_1
            const assetId = placeholders[placeholderName]; // might be null or undefined
            if (assetId) {
                const asset = assets.find(a => a.id === assetId);
                return asset ? asset.url : null;
            }
            return null; // Placeholder not assigned
        }

        // Direct URL (if supported later)
        return source;
    };

    const resolveText = (text?: string) => {
        if (!text) return '';
        // Could also resolve text placeholders later
        // e.g. {{text_1}}
        return text;
    };

    const visibleBlocks = template.timeline.filter(
        (block) => currentTime >= block.start && currentTime < block.start + block.duration
    );

    // Sort by track (z-index)
    visibleBlocks.sort((a, b) => a.track - b.track);

    return (
        <div
            ref={canvasRef}
            className="relative bg-black w-full h-full overflow-hidden"
            style={{
                aspectRatio: `${template.canvas.width} / ${template.canvas.height}`,
            }}
        >
            {visibleBlocks.map((block) => {
                const sourceUrl = resolveSource(block.source);
                const textContent = resolveText(block.text);

                // Base styles
                const style: React.CSSProperties = {
                    position: 'absolute',
                    left: block.x ?? 0,
                    top: block.y ?? 0,
                    width: block.width ?? '100%',
                    height: block.height ?? '100%',
                    zIndex: block.track,
                    backgroundColor: block.backgroundColor,
                    color: block.color ?? 'white',
                    fontSize: block.fontSize ?? 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none', // For now, no direct manipulation on canvas
                };

                if (block.type === 'video' && sourceUrl) {
                    return (
                        <div key={block.id} style={style}>
                            <video
                                src={sourceUrl}
                                className="w-full h-full object-cover"
                                // Sync video time
                                ref={(el) => {
                                    if (el) {
                                        const relativeTime = currentTime - block.start;
                                        if (Math.abs(el.currentTime - relativeTime) > 0.3) {
                                            el.currentTime = relativeTime;
                                        }
                                        if (isPlaying) {
                                            el.play().catch(() => { });
                                        } else {
                                            el.pause();
                                        }
                                    }
                                }}
                                muted // Mute for preview to avoid chaos
                                playsInline
                            />
                        </div>
                    )
                }

                if (block.type === 'image' && sourceUrl) {
                    return (
                        <div key={block.id} style={style}>
                            <img src={sourceUrl} className="w-full h-full object-cover" />
                        </div>
                    );
                }

                if (block.type === 'text') {
                    return (
                        <div key={block.id} style={style}>
                            {textContent}
                        </div>
                    );
                }

                // Fallback for missing source
                return (
                    <div key={block.id} style={{ ...style, border: '1px dashed red' }}>
                        Missing Source: {block.source}
                    </div>
                );

            })}
        </div>
    );
}
