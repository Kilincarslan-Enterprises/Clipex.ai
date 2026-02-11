'use client';

import { useState } from 'react';
import { CanvasPreview } from './CanvasPreview';
import { Timeline } from './Timeline';
import { JsonEditor } from './JsonEditor';
import { useStore } from '@/lib/store';
import { Asset, Block } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { Code, Layers, Video, Loader2, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export function EditorPanel() {
    const [viewMode, setViewMode] = useState<'visual' | 'json' | 'render'>('visual');
    const [isRendering, setIsRendering] = useState(false);
    const [renderUrl, setRenderUrl] = useState<string | null>(null);
    const router = useRouter();

    const { addBlock, currentTime, setPlaceholder, template, assets, placeholders } = useStore();

    const [renderProgress, setRenderProgress] = useState(0);

    const handleRender = async () => {
        setIsRendering(true);
        setRenderUrl(null);
        setRenderProgress(0);

        try {
            // Start Job
            const startResponse = await fetch('/api/render', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    template,
                    assets,
                    placeholders
                })
            });

            if (!startResponse.ok) throw new Error('Failed to start render');
            const { jobId } = await startResponse.json();

            // Poll Status
            const pollInterval = setInterval(async () => {
                try {
                    const statusRes = await fetch(`/api/render/status/${jobId}`);
                    if (!statusRes.ok) throw new Error('Status check failed');

                    const statusData = await statusRes.json();
                    setRenderProgress(statusData.progress || 0);

                    if (statusData.status === 'completed') {
                        clearInterval(pollInterval);
                        setRenderUrl(statusData.url);
                        setViewMode('render');
                        setIsRendering(false);
                    } else if (statusData.status === 'failed') {
                        clearInterval(pollInterval);
                        throw new Error(statusData.error || 'Render failed');
                    }
                } catch (e: any) {
                    clearInterval(pollInterval);
                    console.error("Polling error", e);
                    alert(`Render failed: ${e.message}`);
                    setIsRendering(false);
                }
            }, 1000);

        } catch (e: any) {
            console.error("Render error", e);
            alert(`Render failed: ${e.message}`);
            setIsRendering(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (viewMode !== 'visual') return;

        const data = e.dataTransfer.getData('application/json');
        if (!data) return;

        try {
            const parsed = JSON.parse(data);

            if (parsed.type === 'library') {
                // Library item (dragged from the type cards)
                const blockType = parsed.blockType as Block['type'];
                const newBlock: Block = {
                    id: uuidv4(),
                    type: blockType,
                    track: 0,
                    start: currentTime,
                    duration: blockType === 'text' ? 3 : 5,
                    x: 0,
                    y: 0,
                    width: 0,
                    height: 0,
                    ...(blockType === 'text' ? { text: 'Your Text Here', fontSize: 48, color: '#ffffff' } : {}),
                    ...(blockType === 'audio' ? { volume: 100, loop: false } : {}),
                    source: blockType === 'text' ? undefined : '',
                };
                addBlock(newBlock);
            } else if (parsed.type === 'asset') {
                const asset = parsed.payload as Asset;
                const shortId = uuidv4().slice(0, 8);
                const placeholderName = `${asset.type}_${shortId}`;

                setPlaceholder(placeholderName, asset.id);

                const newBlock: Block = {
                    id: uuidv4(),
                    type: asset.type === 'audio' ? 'audio' : asset.type === 'video' ? 'video' : 'image',
                    track: 0,
                    start: currentTime,
                    duration: asset.type === 'video' ? 5 : asset.type === 'audio' ? 5 : 3,
                    source: `{{${placeholderName}}}`,
                    x: 0,
                    y: 0,
                    width: 0,
                    height: 0,
                    ...(asset.type === 'audio' ? { volume: 100, loop: false } : {}),
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
                        onClick={() => router.push('/')}
                        className="mr-2 p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                        title="Back to Dashboard"
                    >
                        <ArrowLeft size={18} />
                    </button>
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
                    {isRendering ? `Rendering ${renderProgress}%...` : 'Render Video'}
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
