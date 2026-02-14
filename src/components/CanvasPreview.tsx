'use client';

import { useStore } from '@/lib/store';
import { useEffect, useRef, useState, useCallback } from 'react';

export function CanvasPreview() {
    const { template, currentTime, placeholders, isPlaying, setCurrentTime } = useStore();
    const canvasRef = useRef<HTMLDivElement>(null);
    const [loadErrors, setLoadErrors] = useState<Record<string, boolean>>({});

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

    const resolveSource = useCallback((source?: string) => {
        if (!source) return null;

        // Check for placeholder {{key}}
        const match = source.match(/^{{(.+)}}$/);
        if (match) {
            const placeholderName = match[1];
            const url = placeholders[placeholderName];
            return url || null; // url is now a direct URL string
        }

        // Direct URL
        if (source.startsWith('http://') || source.startsWith('https://')) {
            return source;
        }

        // Empty or invalid
        if (source.trim() === '') return null;

        return source;
    }, [placeholders]);

    const resolveText = (text?: string) => {
        if (!text) return '';
        return text;
    };

    const handleImageError = useCallback((blockId: string) => {
        setLoadErrors(prev => ({ ...prev, [blockId]: true }));
    }, []);

    const handleImageLoad = useCallback((blockId: string) => {
        setLoadErrors(prev => {
            if (prev[blockId]) {
                const next = { ...prev };
                delete next[blockId];
                return next;
            }
            return prev;
        });
    }, []);

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
                    pointerEvents: 'none',
                };

                if (block.type === 'video' && sourceUrl) {
                    return (
                        <div key={block.id} style={style}>
                            <video
                                src={sourceUrl}
                                className="w-full h-full object-cover"
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
                                muted
                                playsInline
                                crossOrigin="anonymous"
                            />
                        </div>
                    );
                }

                if (block.type === 'image' && sourceUrl) {
                    return (
                        <div key={block.id} style={style}>
                            {loadErrors[block.id] ? (
                                <div className="flex flex-col items-center gap-1 text-red-400 text-xs">
                                    <span>⚠ Failed to load</span>
                                    <span className="text-neutral-600 text-[10px] max-w-[160px] truncate">{sourceUrl}</span>
                                </div>
                            ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={sourceUrl}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    crossOrigin="anonymous"
                                    onError={() => handleImageError(block.id)}
                                    onLoad={() => handleImageLoad(block.id)}
                                />
                            )}
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

                // Fallback: placeholder without source assigned
                return (
                    <div key={block.id} style={{ ...style, border: '1px dashed rgba(255,255,255,0.2)' }}>
                        <div className="flex flex-col items-center gap-1 text-neutral-500 text-xs">
                            <span className="text-lg">🖼</span>
                            <span>No source URL</span>
                        </div>
                    </div>
                );

            })}
        </div>
    );
}
