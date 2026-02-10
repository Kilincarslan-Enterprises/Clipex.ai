'use client';

import { useStore } from '@/lib/store';
import { Block } from '@/types';
import { Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export function PropertiesPanel() {
    const {
        selectedBlockId,
        template,
        updateBlock,
        removeBlock,
        assets,
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

    const handlePlaceholderAssignment = (placeholderName: string, assetId: string) => {
        setPlaceholder(placeholderName, assetId === '' ? null : assetId);
    };

    const isPlaceholderSource = selectedBlock.source?.match(/^{{(.+)}}$/);
    const placeholderName = isPlaceholderSource ? isPlaceholderSource[1] : null;

    const toggleDynamic = (isDynamic: boolean) => {
        if (isDynamic) {
            // Switch to dynamic
            const shortId = uuidv4().slice(0, 8);
            const pName = `${selectedBlock.type}_${shortId}`;
            // If currently pointing to an asset ID, maybe we should auto-assign it?
            // But for now just create a fresh placeholder
            updateBlock(selectedBlock.id, { source: `{{${pName}}}` });
            // We could optionally pre-fill the placeholder if we knew what asset URL it was, but URL -> ID mapping is tricky without lookup
        } else {
            // Switch to static
            // We need a URL. If it was a placeholder, we lose the reference unless we know which asset it was.
            // If there is an assigned asset in the placeholder, use that URL.
            if (placeholderName) {
                const assetId = placeholders[placeholderName];
                if (assetId) {
                    const asset = assets.find(a => a.id === assetId);
                    if (asset) {
                        updateBlock(selectedBlock.id, { source: asset.url });
                        return;
                    }
                }
            }
            // Fallback
            updateBlock(selectedBlock.id, { source: '' });
        }
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

            <div className="p-4 space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-neutral-500 uppercase">Type</label>
                        <div className="text-sm font-mono text-neutral-300 bg-neutral-800 px-2 py-1 rounded w-fit">
                            {selectedBlock.type}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
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
                    <div className="grid grid-cols-2 gap-4">
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
                </div>

                <hr className="border-neutral-800" />

                {/* Content specific properties */}
                <div className="space-y-4">
                    {selectedBlock.type === 'text' && (
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-neutral-500 uppercase">Text Content</label>
                            <textarea
                                value={selectedBlock.text || ''}
                                onChange={(e) => updateBlock(selectedBlock.id, { text: e.target.value })}
                                className="bg-neutral-800 border-none rounded px-2 py-1 text-sm text-neutral-200 focus:ring-1 focus:ring-blue-500 outline-none min-h-[80px]"
                            />
                            <div className="grid grid-cols-2 gap-4 mt-2">
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-neutral-500 uppercase">Font Size</label>
                                    <input type="number" value={selectedBlock.fontSize || 24} onChange={(e) => updateBlock(selectedBlock.id, { fontSize: parseInt(e.target.value) })} className="bg-neutral-800 border-none rounded px-2 py-1 text-sm text-neutral-200 outline-none" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-neutral-500 uppercase">Color</label>
                                    <input type="color" value={selectedBlock.color || '#ffffff'} onChange={(e) => updateBlock(selectedBlock.id, { color: e.target.value })} className="h-8 w-full rounded border-none" />
                                </div>
                            </div>
                        </div>
                    )}

                    {(selectedBlock.type === 'video' || selectedBlock.type === 'image') && (
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="dynamic-check"
                                    checked={!!placeholderName}
                                    onChange={(e) => toggleDynamic(e.target.checked)}
                                    className="rounded bg-neutral-800 border-neutral-700 text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="dynamic-check" className="text-sm text-neutral-300 font-medium">Dynamic Asset</label>
                            </div>

                            {placeholderName ? (
                                <div className="bg-neutral-800/50 p-3 rounded border border-blue-900/30">
                                    <label className="text-xs text-blue-400 uppercase font-bold mb-2 block">
                                        Assign {placeholderName}
                                    </label>
                                    <select
                                        className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm text-neutral-300 focus:ring-1 focus:ring-blue-500 outline-none"
                                        value={placeholders[placeholderName] || ''}
                                        onChange={(e) => handlePlaceholderAssignment(placeholderName, e.target.value)}
                                    >
                                        <option value="">-- Select Asset --</option>
                                        {assets
                                            .filter(a => selectedBlock.type === 'video' ? a.type === 'video' : true)
                                            .map(asset => (
                                                <option key={asset.id} value={asset.id}>
                                                    {asset.name}
                                                </option>
                                            ))}
                                    </select>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-neutral-500 uppercase">Static URL</label>
                                    <input
                                        type="text"
                                        value={selectedBlock.source || ''}
                                        onChange={(e) => updateBlock(selectedBlock.id, { source: e.target.value })}
                                        placeholder="https://..."
                                        className="bg-neutral-800 border-none rounded px-2 py-1 text-sm text-neutral-200 focus:ring-1 focus:ring-blue-500 outline-none"
                                    />
                                    <p className="text-[10px] text-neutral-500">
                                        Or drop an asset here (not implemented yet, drag to timeline instead).
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <hr className="border-neutral-800" />

                {/* Style/Position */}
                <div className="space-y-4">
                    <h3 className="text-xs font-bold text-neutral-500 uppercase">Appearance</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-neutral-500 uppercase">X</label>
                            <input
                                type="number"
                                value={selectedBlock.x || 0}
                                onChange={(e) => updateBlock(selectedBlock.id, { x: parseFloat(e.target.value) || 0 })}
                                className="bg-neutral-800 border-none rounded px-2 py-1 text-sm text-neutral-200 focus:ring-1 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-neutral-500 uppercase">Y</label>
                            <input
                                type="number"
                                value={selectedBlock.y || 0}
                                onChange={(e) => updateBlock(selectedBlock.id, { y: parseFloat(e.target.value) || 0 })}
                                className="bg-neutral-800 border-none rounded px-2 py-1 text-sm text-neutral-200 focus:ring-1 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-neutral-500 uppercase">Width</label>
                            <input
                                type="number"
                                value={selectedBlock.width || 0}
                                placeholder="Auto"
                                onChange={(e) => updateBlock(selectedBlock.id, { width: parseFloat(e.target.value) || 0 })}
                                className="bg-neutral-800 border-none rounded px-2 py-1 text-sm text-neutral-200 focus:ring-1 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-neutral-500 uppercase">Height</label>
                            <input
                                type="number"
                                value={selectedBlock.height || 0}
                                placeholder="Auto"
                                onChange={(e) => updateBlock(selectedBlock.id, { height: parseFloat(e.target.value) || 0 })}
                                className="bg-neutral-800 border-none rounded px-2 py-1 text-sm text-neutral-200 focus:ring-1 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
