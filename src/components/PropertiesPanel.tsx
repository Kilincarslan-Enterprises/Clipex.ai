'use client';

import { useStore } from '@/lib/store';
import { Trash2, Volume2, Loader2, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';
import { AnimationsSection } from '@/components/properties/AnimationsSection';

export function PropertiesPanel() {
    const {
        selectedBlockId,
        template,
        updateBlock,
        removeBlock,
    } = useStore();

    const selectedBlock = template.timeline.find((b) => b.id === selectedBlockId);

    if (!selectedBlock) {
        return (
            <div className="p-4 text-neutral-500 text-sm h-full flex items-center justify-center">
                Select a block to edit properties
            </div>
        );
    }

    // ── Dynamic field helpers ──
    const dynamicFields = selectedBlock.dynamicFields || [];
    const hasDynamicFields = dynamicFields.length > 0;

    const toggleFieldDynamic = (fieldName: string) => {
        const current = selectedBlock.dynamicFields || [];
        let newFields: string[];
        if (current.includes(fieldName)) {
            newFields = current.filter(f => f !== fieldName);
        } else {
            newFields = [...current, fieldName];
        }

        const updates: Record<string, any> = { dynamicFields: newFields };
        // Auto-generate dynamicId if first dynamic field
        if (newFields.length > 0 && !selectedBlock.dynamicId) {
            const count = template.timeline.filter(b => b.type === selectedBlock.type && b.dynamicId).length + 1;
            updates.dynamicId = `${selectedBlock.type}_${count}`;
        }
        if (newFields.length === 0) {
            updates.dynamicId = undefined;
        }
        updateBlock(selectedBlock.id, updates);
    };

    const isFieldDynamic = (fieldName: string) => dynamicFields.includes(fieldName);

    /** Small ⚡ icon-only toggle */
    const Dyn = ({ field }: { field: string }) => {
        const active = isFieldDynamic(field);
        return (
            <button
                onClick={(e) => { e.preventDefault(); toggleFieldDynamic(field); }}
                className={`w-5 h-5 inline-flex items-center justify-center rounded transition-all ${active
                    ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
                    : 'text-neutral-700 hover:text-neutral-500 hover:bg-neutral-800'
                    }`}
                title={active ? `"${field}" is dynamic via API – click to disable` : `Make "${field}" controllable via API`}
            >
                <Zap size={10} className={active ? 'fill-orange-400' : ''} />
            </button>
        );
    };

    const TYPE_COLORS: Record<string, string> = {
        video: 'text-blue-400 bg-blue-500/10',
        image: 'text-emerald-400 bg-emerald-500/10',
        text: 'text-amber-400 bg-amber-500/10',
        audio: 'text-purple-400 bg-purple-500/10',
    };

    /** Input class with optional orange ring when field is dynamic */
    const inputCls = (field?: string) =>
        `bg-neutral-800 border-none rounded px-2 py-1 text-sm text-neutral-200 focus:ring-1 focus:ring-blue-500 outline-none ${field && isFieldDynamic(field) ? 'ring-1 ring-orange-500/40' : ''}`;

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

                {/* Dynamic ID Section */}
                {hasDynamicFields && (
                    <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs text-orange-400 uppercase font-bold flex items-center gap-1">
                                <Zap size={12} className="fill-orange-400" /> Dynamic ID
                            </label>
                            <span className="text-[10px] text-neutral-600">{dynamicFields.length} field(s)</span>
                        </div>
                        <input
                            type="text"
                            value={selectedBlock.dynamicId || ''}
                            onChange={(e) => updateBlock(selectedBlock.id, { dynamicId: e.target.value.replace(/[^a-zA-Z0-9_-]/g, '') })}
                            placeholder="z.B. image_1, product_shot"
                            className="w-full bg-neutral-900 border border-orange-500/20 rounded px-2 py-1 text-sm text-orange-300 font-mono outline-none focus:border-orange-500/50"
                        />
                        <div className="flex flex-wrap gap-1">
                            {dynamicFields.map((f) => (
                                <span key={f} className="text-[10px] bg-orange-500/10 text-orange-400/80 px-1.5 py-0.5 rounded font-mono">
                                    {selectedBlock.dynamicId || '?'}.{f}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* ═══════ Timing ═══════ */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                            <label className="text-xs text-neutral-500 uppercase">Start (s)</label>
                            <Dyn field="start" />
                        </div>
                        <input
                            type="number" step="0.1"
                            value={selectedBlock.start}
                            onChange={(e) => updateBlock(selectedBlock.id, { start: parseFloat(e.target.value) || 0 })}
                            className={inputCls('start')}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                            <label className="text-xs text-neutral-500 uppercase">Duration (s)</label>
                            <Dyn field="duration" />
                        </div>
                        <input
                            type="number" step="0.1"
                            value={selectedBlock.duration}
                            onChange={(e) => updateBlock(selectedBlock.id, { duration: parseFloat(e.target.value) || 0.1 })}
                            className={inputCls('duration')}
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                            <label className="text-xs text-neutral-500 uppercase">Track</label>
                            <Dyn field="track" />
                        </div>
                        <input
                            type="number" step="1"
                            value={selectedBlock.track}
                            onChange={(e) => updateBlock(selectedBlock.id, { track: parseInt(e.target.value) || 0 })}
                            className={inputCls('track')}
                        />
                    </div>
                </div>

                <hr className="border-neutral-800" />

                {/* ═══════ TEXT PROPERTIES ═══════ */}
                {selectedBlock.type === 'text' && (
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-amber-400 uppercase">Text Properties</h3>

                        {/* ── Mode Toggle: Text / Subtitles ── */}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-neutral-500 uppercase">Mode</label>
                            <div className="flex rounded-lg overflow-hidden border border-neutral-700 bg-neutral-800">
                                <button
                                    onClick={() => updateBlock(selectedBlock.id, { subtitleEnabled: false })}
                                    className={`flex-1 px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all ${!selectedBlock.subtitleEnabled
                                        ? 'bg-amber-500/20 text-amber-400 border-r border-neutral-700'
                                        : 'text-neutral-500 hover:text-neutral-300 border-r border-neutral-700'
                                        }`}
                                >
                                    Text
                                </button>
                                <button
                                    onClick={() => updateBlock(selectedBlock.id, { subtitleEnabled: true })}
                                    className={`flex-1 px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all ${selectedBlock.subtitleEnabled
                                        ? 'bg-cyan-500/20 text-cyan-400'
                                        : 'text-neutral-500 hover:text-neutral-300'
                                        }`}
                                >
                                    Subtitles
                                </button>
                            </div>
                        </div>

                        {/* ── Content: Text Mode ── */}
                        {!selectedBlock.subtitleEnabled && (
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs text-neutral-500 uppercase">Content</label>
                                    <Dyn field="text" />
                                </div>
                                <textarea
                                    value={selectedBlock.text || ''}
                                    onChange={(e) => updateBlock(selectedBlock.id, { text: e.target.value })}
                                    className={`bg-neutral-800 border-none rounded px-2 py-1 text-sm text-neutral-200 focus:ring-1 focus:ring-amber-500 outline-none min-h-[80px] resize-none ${isFieldDynamic('text') ? 'ring-1 ring-orange-500/40' : ''}`}
                                />
                            </div>
                        )}

                        {/* ── Content: Subtitles Mode ── */}
                        {selectedBlock.subtitleEnabled && (
                            <div className="space-y-3 bg-neutral-800/30 p-3 rounded border border-cyan-900/20">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs text-neutral-500 uppercase">VTT Source</label>
                                        <Dyn field="subtitleSource" />
                                    </div>
                                    <textarea
                                        value={selectedBlock.subtitleSource || ''}
                                        onChange={(e) => updateBlock(selectedBlock.id, { subtitleSource: e.target.value })}
                                        placeholder={"Paste VTT content here\n\nWEBVTT\n\n00:00.000 --> 00:02.000\nHello World\n\n00:02.000 --> 00:05.000\nThis is a subtitle"}
                                        className={`bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-sm text-neutral-200 focus:ring-1 focus:ring-cyan-500 outline-none min-h-[100px] resize-none font-mono text-xs ${isFieldDynamic('subtitleSource') ? 'ring-1 ring-orange-500/40' : ''}`}
                                    />
                                </div>
                                <span className="text-[10px] text-neutral-600 block">
                                    Paste WebVTT content. Subtitles will use Font Size &amp; Color settings from below.
                                </span>
                            </div>
                        )}

                        {/* ── Styling (always visible) ── */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs text-neutral-500 uppercase">Font Size</label>
                                    <Dyn field="fontSize" />
                                </div>
                                <input
                                    type="number"
                                    value={selectedBlock.fontSize || 24}
                                    onChange={(e) => updateBlock(selectedBlock.id, { fontSize: parseInt(e.target.value) || 24 })}
                                    className={inputCls('fontSize')}
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs text-neutral-500 uppercase">Color</label>
                                    <Dyn field="color" />
                                </div>
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
                                        className={`flex-1 ${inputCls('color')}`}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ═══════ VIDEO / IMAGE PROPERTIES ═══════ */}
                {(selectedBlock.type === 'video' || selectedBlock.type === 'image') && (
                    <div className="space-y-3">
                        <h3 className={`text-xs font-bold uppercase ${selectedBlock.type === 'video' ? 'text-blue-400' : 'text-emerald-400'}`}>
                            {selectedBlock.type === 'video' ? 'Video' : 'Image'} Source
                        </h3>

                        <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                                <label className="text-xs text-neutral-500 uppercase">Source URL</label>
                                <Dyn field="source" />
                            </div>
                            <input
                                type="text"
                                value={selectedBlock.source || ''}
                                onChange={(e) => updateBlock(selectedBlock.id, { source: e.target.value })}
                                placeholder={`https://bucket.example.com/${selectedBlock.type === 'video' ? 'video.mp4' : 'image.jpg'}`}
                                className={inputCls('source')}
                            />
                            {/* Preview thumbnail for direct URL */}
                            {selectedBlock.source && (selectedBlock.source.startsWith('http://') || selectedBlock.source.startsWith('https://')) && (
                                <UrlPreviewThumb url={selectedBlock.source} type={selectedBlock.type} />
                            )}
                        </div>
                    </div>
                )}

                {/* ═══════ AUDIO PROPERTIES ═══════ */}
                {selectedBlock.type === 'audio' && (
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-purple-400 uppercase">Audio Properties</h3>

                        {/* Source */}
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                                <label className="text-xs text-neutral-500 uppercase">Source</label>
                                <Dyn field="source" />
                            </div>
                            <input
                                type="text"
                                value={selectedBlock.source || ''}
                                onChange={(e) => updateBlock(selectedBlock.id, { source: e.target.value })}
                                placeholder="Audio URL"
                                className={inputCls('source')}
                            />
                        </div>

                        {/* Volume */}
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                                <label className="text-xs text-neutral-500 uppercase flex items-center gap-1">
                                    <Volume2 size={12} /> Volume
                                </label>
                                <Dyn field="volume" />
                            </div>
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
                    </div>
                )}

                {/* ═══════ POSITION & SIZE (Video/Image/Text only) ═══════ */}
                {selectedBlock.type !== 'audio' && (
                    <>
                        <hr className="border-neutral-800" />
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-neutral-500 uppercase">Position & Size</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs text-neutral-500 uppercase">X</label>
                                        <Dyn field="x" />
                                    </div>
                                    <input
                                        type="number"
                                        value={selectedBlock.x || 0}
                                        onChange={(e) => updateBlock(selectedBlock.id, { x: parseFloat(e.target.value) || 0 })}
                                        className={inputCls('x')}
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs text-neutral-500 uppercase">Y</label>
                                        <Dyn field="y" />
                                    </div>
                                    <input
                                        type="number"
                                        value={selectedBlock.y || 0}
                                        onChange={(e) => updateBlock(selectedBlock.id, { y: parseFloat(e.target.value) || 0 })}
                                        className={inputCls('y')}
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs text-neutral-500 uppercase">Width</label>
                                        <Dyn field="width" />
                                    </div>
                                    <input
                                        type="text"
                                        value={selectedBlock.width ?? '100%'}
                                        placeholder="100%"
                                        onChange={(e) => {
                                            const v = e.target.value;
                                            // Store as string if contains %, else as number
                                            if (v.includes('%')) {
                                                updateBlock(selectedBlock.id, { width: v });
                                            } else {
                                                const n = parseFloat(v);
                                                updateBlock(selectedBlock.id, { width: isNaN(n) ? '100%' : n });
                                            }
                                        }}
                                        className={inputCls('width')}
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs text-neutral-500 uppercase">Height</label>
                                        <Dyn field="height" />
                                    </div>
                                    <input
                                        type="text"
                                        value={selectedBlock.height ?? '100%'}
                                        placeholder="100%"
                                        onChange={(e) => {
                                            const v = e.target.value;
                                            if (v.includes('%')) {
                                                updateBlock(selectedBlock.id, { height: v });
                                            } else {
                                                const n = parseFloat(v);
                                                updateBlock(selectedBlock.id, { height: isNaN(n) ? '100%' : n });
                                            }
                                        }}
                                        className={inputCls('height')}
                                    />
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* ═══════ ANIMATIONS (Video/Image/Text) ═══════ */}
                {selectedBlock.type !== 'audio' && (
                    <AnimationsSection
                        blockId={selectedBlock.id}
                        toggleFieldDynamic={toggleFieldDynamic}
                        isFieldDynamic={isFieldDynamic}
                    />
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
                    onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.src.includes('/api/proxy-image')) {
                            target.src = `/api/proxy-image?url=${encodeURIComponent(url)}`;
                        } else {
                            setStatus('error');
                        }
                    }}
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
                    onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.src.includes('/api/proxy-image')) {
                            target.src = `/api/proxy-image?url=${encodeURIComponent(url)}`;
                        } else {
                            setStatus('error');
                        }
                    }}
                    muted
                    crossOrigin="anonymous"
                />
            </div>
        );
    }

    return null;
}
