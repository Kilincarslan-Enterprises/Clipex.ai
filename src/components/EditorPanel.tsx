'use client';

import { useState } from 'react';
import { CanvasPreview } from './CanvasPreview';
import { Timeline } from './Timeline';
import { JsonEditor } from './JsonEditor';
import { useStore } from '@/lib/store';
import { Asset, Block } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { Code, LayoutTemplate, Layers, Video, Play, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function EditorPanel() {
    const [viewMode, setViewMode] = useState<'visual' | 'json' | 'render'>('visual');
    const [isRendering, setIsRendering] = useState(false);
    const [renderUrl, setRenderUrl] = useState<string | null>(null);

    const { addBlock, currentTime, setPlaceholder, template, assets, placeholders } = useStore();

    const handleRender = async () => {
        setIsRendering(true);
        setRenderUrl(null);
        try {
            const response = await fetch('/api/render', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    template,
                    assets, // We send assets to backend to resolve IDs to file paths
                    placeholders
                })
            });

            if (!response.ok) throw new Error('Render failed');

            const data = await response.json();
            setRenderUrl(data.url);
            setViewMode('render');
        } catch (e) {
            console.error("Render error", e);
            alert("Render failed, check console");
        } finally {
            setIsRendering(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (viewMode !== 'visual') return; // Only allow drop in visual mode

        const data = e.dataTransfer.getData('application/json');
        if (!data) return;

        try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'asset') {
                const asset = parsed.payload as Asset;
                const shortId = uuidv4().slice(0, 8);
                const placeholderName = `${asset.type}_${shortId}`;

                // 1. Create Placeholder Loopup
                setPlaceholder(placeholderName, asset.id);

                // 2. Create Block
                const newBlock: Block = {
                    id: uuidv4(),
                    type: asset.type === 'video' ? 'video' : 'image',
                    track: 0,
                    start: currentTime,
                    duration: asset.type === 'video' ? 5 : 3,
                    source: `{{${placeholderName}}}`,
                    x: 0,
                    y: 0,
                    width: 0, // 0 usually means auto/full width in my simplistic model logic or treated as 100%
                    height: 0,
                    backgroundColor: 'transparent'
                };

                addBlock(newBlock);
            }
        } catch (err) {
            console.error('Drop error', err);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    return (
        <div
            className="flex-1 flex flex-col min-w-0 bg-neutral-950 h-full relative"
        >
            {/* Toggle Bar */}
            <div className="flex h-12 items-center justify-between px-4 bg-neutral-900 border-b border-neutral-800 shrink-0">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setViewMode('visual')}
                        className={cn(
                            "px-3 py-1.5 rounded text-sm flex items-center gap-2 transition-colors font-medium",
                            viewMode === 'visual' ? "bg-neutral-800 text-white" : "text-neutral-500 hover:text-neutral-300"
                        )}
                    >
                        <Layers size={14} /> Visual
                    </button>
                    <button
                        onClick={() => setViewMode('json')}
                        className={cn(
                            "px-3 py-1.5 rounded text-sm flex items-center gap-2 transition-colors font-medium",
                            viewMode === 'json' ? "bg-neutral-800 text-white" : "text-neutral-500 hover:text-neutral-300"
                        )}
                    >
                        <Code size={14} /> JSON
                    </button>
                </div>

                <button
                    onClick={handleRender}
                    disabled={isRendering}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isRendering ? <Loader2 size={14} className="animate-spin" /> : <Video size={14} />}
                    {isRendering ? 'Rendering...' : 'Render Video'}
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative flex flex-col">
                {viewMode === 'render' && renderUrl ? (
                    <div className="flex-1 flex flex-col items-center justify-center bg-neutral-950 p-8 gap-4">
                        <h2 className="text-xl font-bold text-neutral-200">Rendered Output</h2>
                        <video src={renderUrl} controls className="max-h-[80%] max-w-full shadow-2xl bg-black rounded" />
                        <a href={renderUrl} download className="text-blue-400 hover:underline text-sm">Download Video</a>
                    </div>
                ) : viewMode === 'visual' ? (
                    <>
                        {/* Viewport for Canvas */}
                        <div
                            className="flex-1 flex items-center justify-center bg-neutral-950 relative overflow-hidden p-8"
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                        >
                            <div className="bg-black shadow-2xl relative h-full max-h-[90%] w-auto aspect-[9/16] ring-1 ring-neutral-800">
                                <CanvasPreview />
                            </div>
                        </div>

                        {/* Timeline Section */}
                        <div className="h-[320px] shrink-0 border-t border-neutral-800 bg-neutral-900 z-10">
                            <Timeline />
                        </div>
                    </>
                ) : viewMode === 'json' ? (
                    <div className="flex-1 bg-[#1e1e1e] overflow-hidden">
                        <JsonEditor />
                    </div>
                ) : null}
            </div>
        </div>
    );
}
