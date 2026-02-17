'use client';

import { useStore } from '@/lib/store';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { Block, Animation, AnimationEasing } from '@/types';

// ── Animation Helpers ───────────────────────────────────
function easingFn(t: number, easing: AnimationEasing = 'ease_in_out'): number {
    t = Math.max(0, Math.min(1, t));
    switch (easing) {
        case 'linear': return t;
        case 'ease_in': return t * t;
        case 'ease_out': return t * (2 - t);
        case 'ease_in_out': return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        case 'bounce': {
            if (t < 1 / 2.75) return 7.5625 * t * t;
            if (t < 2 / 2.75) { t -= 1.5 / 2.75; return 7.5625 * t * t + 0.75; }
            if (t < 2.5 / 2.75) { t -= 2.25 / 2.75; return 7.5625 * t * t + 0.9375; }
            t -= 2.625 / 2.75; return 7.5625 * t * t + 0.984375;
        }
        default: return t;
    }
}

function computeAnimationStyle(block: Block, currentTime: number): React.CSSProperties {
    const animations = block.animations;
    if (!animations || animations.length === 0) return {};

    const blockLocalTime = currentTime - block.start; // time within the block
    let translateX = 0;
    let translateY = 0;
    let scaleVal = 1;
    let rotateVal = 0;
    let opacity = 1;

    for (const anim of animations) {
        const animStart = anim.time;
        const animEnd = anim.time + anim.duration;

        // Skip if not within this animation's time window
        if (blockLocalTime < animStart || blockLocalTime > animEnd) continue;

        const rawProgress = (blockLocalTime - animStart) / anim.duration;
        const progress = easingFn(rawProgress, anim.easing);

        switch (anim.type) {
            case 'shake': {
                const str = anim.strength ?? 10;
                const freq = anim.frequency ?? 8;
                const phase = blockLocalTime * freq * Math.PI * 2;
                // Decay shake over time
                const decay = 1 - rawProgress;
                translateX += Math.sin(phase) * str * decay;
                translateY += Math.cos(phase * 0.7) * str * 0.5 * decay;
                break;
            }
            case 'fade_in': {
                opacity *= progress;
                break;
            }
            case 'fade_out': {
                opacity *= 1 - progress;
                break;
            }
            case 'slide_in': {
                const dist = 300; // px from off-screen
                const remaining = 1 - progress;
                switch (anim.direction) {
                    case 'left': translateX -= dist * remaining; break;
                    case 'right': translateX += dist * remaining; break;
                    case 'top': translateY -= dist * remaining; break;
                    case 'bottom': translateY += dist * remaining; break;
                    default: translateX -= dist * remaining;
                }
                break;
            }
            case 'slide_out': {
                const dist = 300;
                switch (anim.direction) {
                    case 'left': translateX -= dist * progress; break;
                    case 'right': translateX += dist * progress; break;
                    case 'top': translateY -= dist * progress; break;
                    case 'bottom': translateY += dist * progress; break;
                    default: translateX -= dist * progress;
                }
                break;
            }
            case 'scale': {
                const s0 = anim.startScale ?? 0;
                const s1 = anim.endScale ?? 1;
                scaleVal *= s0 + (s1 - s0) * progress;
                break;
            }
            case 'rotate': {
                const totalAngle = anim.angle ?? 360;
                const dir = anim.rotateDirection === 'ccw' ? -1 : 1;
                rotateVal += totalAngle * progress * dir;
                break;
            }
            case 'bounce': {
                const str = anim.strength ?? 20;
                const freq = anim.frequency ?? 3;
                const decay = 1 - rawProgress;
                translateY -= Math.abs(Math.sin(rawProgress * freq * Math.PI)) * str * decay;
                break;
            }
            case 'pulse': {
                const str = anim.strength ?? 0.2;
                const freq = anim.frequency ?? 2;
                const pulseFactor = 1 + Math.sin(rawProgress * freq * Math.PI * 2) * str;
                scaleVal *= pulseFactor;
                break;
            }
        }
    }

    const transforms: string[] = [];
    if (translateX !== 0 || translateY !== 0) transforms.push(`translate(${translateX.toFixed(1)}px, ${translateY.toFixed(1)}px)`);
    if (scaleVal !== 1) transforms.push(`scale(${scaleVal.toFixed(3)})`);
    if (rotateVal !== 0) transforms.push(`rotate(${rotateVal.toFixed(1)}deg)`);

    const style: React.CSSProperties = {};
    if (transforms.length > 0) style.transform = transforms.join(' ');
    if (opacity !== 1) style.opacity = Math.max(0, Math.min(1, opacity));

    return style;
}

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

    const handleMediaError = useCallback((e: any, sourceUrl: string | null) => {
        const target = e.currentTarget;
        const currentSrc = target.src;

        // If it's a valid remote URL and we haven't already retried via proxy
        if (sourceUrl && (sourceUrl.startsWith('http') || sourceUrl.startsWith('https')) && !currentSrc.includes('/api/proxy-image')) {
            console.log(`Media load failed (CORS?), retrying via proxy: ${sourceUrl}`);
            const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(sourceUrl)}`;
            target.src = proxyUrl;
        } else {
            // Already tried proxy or not a remote URL
            if (target.tagName === 'IMG') {
                setLoadErrors(prev => ({ ...prev, [target.id]: true }));
            }
        }
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
                const animStyle = computeAnimationStyle(block, currentTime);
                const style: React.CSSProperties = {
                    position: 'absolute',
                    left: block.x ?? 0,
                    top: block.y ?? 0,
                    width: block.width || '100%',
                    height: block.height || '100%',
                    zIndex: block.track,
                    backgroundColor: block.backgroundColor,
                    color: block.color ?? 'white',
                    fontSize: block.fontSize ?? 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                    ...animStyle,
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
                                onError={(e) => handleMediaError(e, sourceUrl)}
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
                                    id={block.id}
                                    src={sourceUrl}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    crossOrigin="anonymous"
                                    onError={(e) => handleMediaError(e, sourceUrl)}
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
