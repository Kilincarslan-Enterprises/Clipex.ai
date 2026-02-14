'use client';

import { useStore } from '@/lib/store';
import { Trash2, Volume2, Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useState, useEffect } from 'react';

export function PropertiesPanel() {
    const {
        selectedBlockId,
        template,
        updateBlock,
        removeBlock,
        placeholders,
        setPlaceholder
    } = useStore();

    const selectedBlock = template.timeline.find((b) => b.id === selectedBlockId);

    if (!selectedBlock) {
        return (
            <div className="p-4 text-neutral-500 text-sm h-full flex items-center justify-center">
                Select a block to edit properties
            </div>
        );
    }

    const isPlaceholderSource = selectedBlock.source?.match(/^{{(.+)}}$/);
    const placeholderName = isPlaceholderSource ? isPlaceholderSource[1] : null;

    const toggleDynamic = (isDynamic: boolean) => {
        if (isDynamic) {
            const shortId = uuidv4().slice(0, 8);
            const pName = `${selectedBlock.type}_${shortId}`;
            updateBlock(selectedBlock.id, { source: `{{${pName}}}` });
        } else {
            // Convert back to direct URL
            if (placeholderName) {
                const url = placeholders[placeholderName];
                updateBlock(selectedBlock.id, { source: url || '' });
            } else {
                updateBlock(selectedBlock.id, { source: '' });
            }
        }
    };

    const TYPE_COLORS: Record<string, string> = {
        video: 'text-blue-400 bg-blue-500/10',
        image: 'text-emerald-400 bg-emerald-500/10',
        text: 'text-amber-400 bg-amber-500/10',
        audio: 'text-purple-400 bg-purple-500/10',
    };

    return (
        <div className="flex flex-col h-full bg-neutral-900 overflow-y-auto">
            <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-900 sticky top-0 z-10">
                <h2 className="font-bold text-sm text-neutral-200 uppercase tracking-widest">Properties</h2>
                <button
                    onClick={() => removeBlock(selectedBlock.id)}
                    className="p-1 hover:text-red-500 text-neutral-500 transition-colors"
                    title="Delete Block"
                >
                    <Trash2 size={16} />
                </button>
            </div>

            <div className="p-4 space-y-5">
                {/* Type Badge */}
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-neutral-500 uppercase">Type</label>
                    <div className={`text-sm font-mono px-2 py-1 rounded w-fit capitalize ${TYPE_COLORS[selectedBlock.type] || 'text-neutral-300 bg-neutral-800'}`}>
                        {selectedBlock.type}
                    </div>
                </div>

                {/* Timing */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-neutral-500 uppercase">Start (s)</label>
                        <input
                            type="number"
                            step="0.1"
                            value={selectedBlock.start}
                            onChange={(e) => updateBlock(selectedBlock.id, { start: parseFloat(e.target.value) || 0 })}
                            className="bg-neutral-800 border-none rounded px-2 py-1 text-sm text-neutral-200 focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-neutral-500 uppercase">Duration (s)</label>
                        <input
                            type="number"
                            step="0.1"
                            value={selectedBlock.duration}
                            onChange={(e) => updateBlock(selectedBlock.id, { duration: parseFloat(e.target.value) || 0.1 })}
                            className="bg-neutral-800 border-none rounded px-2 py-1 text-sm text-neutral-200 focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-neutral-500 uppercase">Track</label>
                        <input
                            type="number"
                            step="1"
                            value={selectedBlock.track}
                            onChange={(e) => updateBlock(selectedBlock.id, { track: parseInt(e.target.value) || 0 })}
                            className="bg-neutral-800 border-none rounded px-2 py-1 text-sm text-neutral-200 focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>

                <hr className="border-neutral-800" />

                {/* ==================== TEXT PROPERTIES ==================== */}
                {selectedBlock.type === 'text' && (
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-amber-400 uppercase">Text Properties</h3>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-neutral-500 uppercase">Content</label>
                            <textarea
                                value={selectedBlock.text || ''}
                                onChange={(e) => updateBlock(selectedBlock.id, { text: e.target.value })}
                                className="bg-neutral-800 border-none rounded px-2 py-1 text-sm text-neutral-200 focus:ring-1 focus:ring-amber-500 outline-none min-h-[80px] resize-none"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-neutral-500 uppercase">Font Size</label>
                                <input
                                    type="number"
                                    value={selectedBlock.fontSize || 24}
                                    onChange={(e) => updateBlock(selectedBlock.id, { fontSize: parseInt(e.target.value) || 24 })}
                                    className="bg-neutral-800 border-none rounded px-2 py-1 text-sm text-neutral-200 outline-none"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-neutral-500 uppercase">Color</label>
                                <div className="flex gap-2">
                                    <input
                                        type="color"
                                        value={selectedBlock.color || '#ffffff'}
                                        onChange={(e) => updateBlock(selectedBlock.id, { color: e.target.value })}
                                        className="h-8 w-8 rounded overflow-hidden cursor-pointer border-none p-0"
                                    />
                                    <input
                                        type="text"
                                        value={selectedBlock.color || '#ffffff'}
                                        onChange={(e) => updateBlock(selectedBlock.id, { color: e.target.value })}
                                        className="flex-1 bg-neutral-800 border-none rounded px-2 py-1 text-sm text-neutral-200 outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ==================== VIDEO / IMAGE PROPERTIES ==================== */}
                {(selectedBlock.type === 'video' || selectedBlock.type === 'image') && (
                    <div className="space-y-3">
                        <h3 className={`text-xs font-bold uppercase ${selectedBlock.type === 'video' ? 'text-blue-400' : 'text-emerald-400'}`}>
                            {selectedBlock.type === 'video' ? 'Video' : 'Image'} Source
                        </h3>

                        {/* Dynamic Toggle */}
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="dynamic-check"
                                checked={!!placeholderName}
                                onChange={(e) => toggleDynamic(e.target.checked)}
                                className="rounded bg-neutral-800 border-neutral-700 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor="dynamic-check" className="text-sm text-neutral-300 font-medium">Dynamic (API Placeholder)</label>
                        </div>

                        {placeholderName ? (
                            <div className="bg-neutral-800/50 p-3 rounded border border-blue-900/30 space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs text-blue-400 uppercase font-bold">
                                        {`{{${placeholderName}}}`}
                                    </label>
                                    <span className="text-[10px] text-neutral-600 font-mono">Placeholder Key</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-neutral-500 uppercase">Preview URL</label>
                                    <input
                                        type="text"
                                        value={placeholders[placeholderName] || ''}
                                        onChange={(e) => setPlaceholder(placeholderName, e.target.value || null)}
                                        placeholder={`https://example.com/${selectedBlock.type === 'video' ? 'video.mp4' : 'image.jpg'}`}
                                        className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm text-neutral-200 focus:ring-1 focus:ring-blue-500 outline-none"
                                    />
                                    <span className="text-[10px] text-neutral-600">
                                        Paste a URL to preview. This value will be overridden by the API at render time.
                                    </span>
                                </div>
                                {/* Preview thumbnail */}
                                {placeholders[placeholderName] && selectedBlock.type === 'image' && (
                                    <UrlPreviewThumb url={placeholders[placeholderName]!} type="image" />
                                )}
                                {placeholders[placeholderName] && selectedBlock.type === 'video' && (
                                    <UrlPreviewThumb url={placeholders[placeholderName]!} type="video" />
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-neutral-500 uppercase">Source URL</label>
                                <input
                                    type="text"
                                    value={selectedBlock.source || ''}
                                    onChange={(e) => updateBlock(selectedBlock.id, { source: e.target.value })}
                                    placeholder={`https://bucket.example.com/${selectedBlock.type === 'video' ? 'video.mp4' : 'image.jpg'}`}
                                    className="bg-neutral-800 border-none rounded px-2 py-1 text-sm text-neutral-200 focus:ring-1 focus:ring-blue-500 outline-none"
                                />
                                {/* Preview thumbnail for direct URL */}
                                {selectedBlock.source && (selectedBlock.source.startsWith('http://') || selectedBlock.source.startsWith('https://')) && (
                                    <UrlPreviewThumb url={selectedBlock.source} type={selectedBlock.type} />
                                )}
                            </div>
                        )}

                        {/* ── Subtitles ── */}
                        <hr className="border-neutral-800" />
                        <h3 className="text-xs font-bold text-cyan-400 uppercase">Subtitles</h3>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="subtitle-enable"
                                checked={selectedBlock.subtitleEnabled || false}
                                onChange={(e) => updateBlock(selectedBlock.id, { subtitleEnabled: e.target.checked })}
                                className="rounded bg-neutral-800 border-neutral-700 text-cyan-600 focus:ring-cyan-500"
                            />
                            <label htmlFor="subtitle-enable" className="text-sm text-neutral-300 font-medium">Enable Subtitles</label>
                        </div>

                        {selectedBlock.subtitleEnabled && (
                            <div className="space-y-3 bg-neutral-800/30 p-3 rounded border border-cyan-900/20">
                                {/* VTT Input */}
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-neutral-500 uppercase">VTT Source</label>
                                    <textarea
                                        value={selectedBlock.subtitleSource || ''}
                                        onChange={(e) => updateBlock(selectedBlock.id, { subtitleSource: e.target.value })}
                                        placeholder={"Paste VTT content, URL to .vtt file, or {{placeholder}}\n\nWEBVTT\n\n00:00.000 --> 00:02.000\nHello World"}
                                        className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-sm text-neutral-200 focus:ring-1 focus:ring-cyan-500 outline-none min-h-[100px] resize-none font-mono text-xs"
                                    />
                                    <span className="text-[10px] text-neutral-600">
                                        Accepts: VTT content, https://...file.vtt, or {'{{placeholder}}'}
                                    </span>
                                </div>

                                {/* Style Reference */}
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-neutral-500 uppercase">Subtitle Style (from Text Block)</label>
                                    <select
                                        className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm text-neutral-300 focus:ring-1 focus:ring-cyan-500 outline-none"
                                        value={selectedBlock.subtitleStyleId || ''}
                                        onChange={(e) => updateBlock(selectedBlock.id, { subtitleStyleId: e.target.value || undefined })}
                                    >
                                        <option value="">Default Style (white, 36px)</option>
                                        {template.timeline
                                            .filter(b => b.type === 'text')
                                            .map(tb => (
                                                <option key={tb.id} value={tb.id}>
                                                    {tb.text ? `"${tb.text.slice(0, 20)}${tb.text.length > 20 ? '...' : ''}"` : 'Untitled Text'} — {tb.fontSize || 24}px, {tb.color || '#fff'}
                                                </option>
                                            ))}
                                    </select>
                                    <span className="text-[10px] text-neutral-600">
                                        Inherits font size, color, and background from the selected text block
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ==================== AUDIO PROPERTIES ==================== */}
                {selectedBlock.type === 'audio' && (
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-purple-400 uppercase">Audio Properties</h3>

                        {/* Source */}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-neutral-500 uppercase">Source</label>
                            <input
                                type="text"
                                value={selectedBlock.source || ''}
                                onChange={(e) => updateBlock(selectedBlock.id, { source: e.target.value })}
                                placeholder="Audio URL or {{placeholder}}"
                                className="bg-neutral-800 border-none rounded px-2 py-1 text-sm text-neutral-200 focus:ring-1 focus:ring-purple-500 outline-none"
                            />
                        </div>

                        {/* Volume */}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-neutral-500 uppercase flex items-center gap-1">
                                <Volume2 size={12} /> Volume
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={selectedBlock.volume ?? 100}
                                    onChange={(e) => updateBlock(selectedBlock.id, { volume: parseInt(e.target.value) })}
                                    className="flex-1 accent-purple-500"
                                />
                                <span className="text-xs text-neutral-400 w-8 text-right">{selectedBlock.volume ?? 100}%</span>
                            </div>
                        </div>

                        {/* Loop */}
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="loop-check"
                                checked={selectedBlock.loop || false}
                                onChange={(e) => updateBlock(selectedBlock.id, { loop: e.target.checked })}
                                className="rounded bg-neutral-800 border-neutral-700 text-purple-600 focus:ring-purple-500"
                            />
                            <label htmlFor="loop-check" className="text-sm text-neutral-300 font-medium">Loop Audio</label>
                        </div>

                        {/* Placeholder URL for Audio */}
                        {placeholderName && (
                            <div className="bg-neutral-800/50 p-3 rounded border border-purple-900/30 space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs text-purple-400 uppercase font-bold">
                                        {`{{${placeholderName}}}`}
                                    </label>
                                    <span className="text-[10px] text-neutral-600 font-mono">Placeholder Key</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-neutral-500 uppercase">Preview URL</label>
                                    <input
                                        type="text"
                                        value={placeholders[placeholderName] || ''}
                                        onChange={(e) => setPlaceholder(placeholderName, e.target.value || null)}
                                        placeholder="https://example.com/audio.mp3"
                                        className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm text-neutral-300 focus:ring-1 focus:ring-purple-500 outline-none"
                                    />
                                    <span className="text-[10px] text-neutral-600">
                                        Paste a URL to preview. Overridden by API at render time.
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ==================== APPEARANCE (Video/Image/Text only) ==================== */}
                {selectedBlock.type !== 'audio' && (
                    <>
                        <hr className="border-neutral-800" />
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-neutral-500 uppercase">Position & Size</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-neutral-500 uppercase">X</label>
                                    <input
                                        type="number"
                                        value={selectedBlock.x || 0}
                                        onChange={(e) => updateBlock(selectedBlock.id, { x: parseFloat(e.target.value) || 0 })}
                                        className="bg-neutral-800 border-none rounded px-2 py-1 text-sm text-neutral-200 outline-none"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-neutral-500 uppercase">Y</label>
                                    <input
                                        type="number"
                                        value={selectedBlock.y || 0}
                                        onChange={(e) => updateBlock(selectedBlock.id, { y: parseFloat(e.target.value) || 0 })}
                                        className="bg-neutral-800 border-none rounded px-2 py-1 text-sm text-neutral-200 outline-none"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-neutral-500 uppercase">Width</label>
                                    <input
                                        type="number"
                                        value={selectedBlock.width || 0}
                                        placeholder="Auto"
                                        onChange={(e) => updateBlock(selectedBlock.id, { width: parseFloat(e.target.value) || 0 })}
                                        className="bg-neutral-800 border-none rounded px-2 py-1 text-sm text-neutral-200 outline-none"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-neutral-500 uppercase">Height</label>
                                    <input
                                        type="number"
                                        value={selectedBlock.height || 0}
                                        placeholder="Auto"
                                        onChange={(e) => updateBlock(selectedBlock.id, { height: parseFloat(e.target.value) || 0 })}
                                        className="bg-neutral-800 border-none rounded px-2 py-1 text-sm text-neutral-200 outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// ── Small preview widget for URLs ──
function UrlPreviewThumb({ url, type }: { url: string; type: string }) {
    const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

    useEffect(() => {
        setStatus('loading');
    }, [url]);

    if (type === 'image') {
        return (
            <div className="mt-1 rounded overflow-hidden border border-neutral-700 bg-black h-20 flex items-center justify-center">
                {status === 'loading' && (
                    <Loader2 size={14} className="animate-spin text-neutral-600" />
                )}
                {status === 'error' && (
                    <span className="text-xs text-red-400">Failed to load</span>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={url}
                    alt="Preview"
                    className={`max-h-full max-w-full object-contain ${status !== 'loaded' ? 'hidden' : ''}`}
                    onLoad={() => setStatus('loaded')}
                    onError={() => setStatus('error')}
                    crossOrigin="anonymous"
                />
            </div>
        );
    }

    if (type === 'video') {
        return (
            <div className="mt-1 rounded overflow-hidden border border-neutral-700 bg-black h-20 flex items-center justify-center">
                {status === 'loading' && (
                    <Loader2 size={14} className="animate-spin text-neutral-600" />
                )}
                {status === 'error' && (
                    <span className="text-xs text-red-400">Failed to load</span>
                )}
                <video
                    src={url}
                    className={`max-h-full max-w-full object-contain ${status !== 'loaded' ? 'hidden' : ''}`}
                    onLoadedData={() => setStatus('loaded')}
                    onError={() => setStatus('error')}
                    muted
                    crossOrigin="anonymous"
                />
            </div>
        );
    }

    return null;
}
