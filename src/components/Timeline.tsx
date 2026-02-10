'use client';

import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { useRef, MouseEvent } from 'react';
import { Play, Pause } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Asset, Block } from '@/types';

const PIXELS_PER_SECOND = 40;
const RULER_INTERVAL = 5; // seconds

export function Timeline() {
    const {
        template,
        currentTime,
        setCurrentTime,
        isPlaying,
        setIsPlaying,
        selectedBlockId,
        selectBlock,
        addBlock // Added missing destructuring
    } = useStore();

    const timelineRef = useRef<HTMLDivElement>(null);

    const handleTimelineClick = (e: MouseEvent) => {
        if (!timelineRef.current) return;
        const rect = timelineRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const scrollLeft = timelineRef.current.scrollLeft;
        const time = (x + scrollLeft) / PIXELS_PER_SECOND;
        setCurrentTime(Math.max(0, time));
    };

    const togglePlay = () => setIsPlaying(!isPlaying);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (!timelineRef.current) return;

        const data = e.dataTransfer.getData('application/json');
        if (!data) return;

        try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'asset') {
                const asset = parsed.payload as Asset;
                const rect = timelineRef.current.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const scrollLeft = timelineRef.current.scrollLeft;
                const time = Math.max(0, (x + scrollLeft) / PIXELS_PER_SECOND);

                // Determine track based on Y position (approximate)
                const y = e.clientY - rect.top;
                // Header is 30px (ruler) + maybe some padding
                const trackIndex = Math.floor((y - 30) / 45);
                const track = Math.max(0, trackIndex);

                const duration = asset.type === 'video' ? 5 : 3;

                // Add block
                const newBlock: Block = {
                    id: uuidv4(),
                    type: asset.type === 'video' ? 'video' : 'image',
                    track: track,
                    start: time,
                    duration: duration,
                    source: asset.url,
                    x: 0,
                    y: 0,
                    width: 0,
                    height: 0,
                };

                addBlock(newBlock);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    // Determine total width based on max duration or fixed minimum
    const maxDuration = Math.max(
        30, // Minimum 30s
        ...template.timeline.map(b => b.start + b.duration)
    );
    const totalWidth = maxDuration * PIXELS_PER_SECOND + 200; // Extra buffer

    return (
        <div className="flex flex-col h-full bg-neutral-900 border-t border-neutral-800">
            {/* Toolbar */}
            <div className="h-10 border-b border-neutral-800 flex items-center px-4 gap-2 bg-neutral-900">
                <button
                    onClick={togglePlay}
                    className="p-1 hover:bg-neutral-800 rounded text-neutral-200"
                >
                    {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <span className="text-xs text-neutral-500 font-mono">
                    {currentTime.toFixed(2)}s
                </span>
            </div>

            {/* Timeline Area */}
            <div className="flex-1 overflow-auto relative custom-scrollbar" ref={timelineRef}>
                <div
                    className="relative h-full min-h-[300px]"
                    style={{ width: totalWidth }}
                    onClick={handleTimelineClick}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                >
                    {/* Ruler */}
                    <div className="h-6 border-b border-neutral-800 sticky top-0 bg-neutral-900 z-10 flex text-xs text-neutral-500">
                        {Array.from({ length: Math.ceil(maxDuration / RULER_INTERVAL) + 1 }).map((_, i) => (
                            <div
                                key={i}
                                className="absolute border-l border-neutral-800 pl-1"
                                style={{ left: i * RULER_INTERVAL * PIXELS_PER_SECOND }}
                            >
                                {i * RULER_INTERVAL}s
                            </div>
                        ))}
                    </div>

                    {/* Playhead */}
                    <div
                        className="absolute top-0 bottom-0 w-[1px] bg-red-500 z-20 pointer-events-none"
                        style={{ left: currentTime * PIXELS_PER_SECOND }}
                    >
                        <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-red-500 -ml-[4.5px]" />
                    </div>

                    {/* Blocks */}
                    <div className="pt-2 px-2">
                        {template.timeline.map((block) => (
                            <div
                                key={block.id}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    selectBlock(block.id);
                                }}
                                className={cn(
                                    "absolute h-10 rounded border text-xs flex items-center px-2 py-1 cursor-pointer select-none overflow-hidden",
                                    selectedBlockId === block.id
                                        ? "bg-blue-900 border-blue-500 text-white z-10"
                                        : "bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700"
                                )}
                                style={{
                                    left: block.start * PIXELS_PER_SECOND,
                                    width: block.duration * PIXELS_PER_SECOND,
                                    top: 30 + (block.track * 45) // Simple track stacking
                                }}
                            >
                                <span className="truncate">{block.type} - {block.id.slice(0, 4)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
