'use client';

import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { useRef, MouseEvent } from 'react';
import { Play, Pause } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Asset, Block, BlockType } from '@/types';

const PIXELS_PER_SECOND = 40;
const RULER_INTERVAL = 5; // seconds

const BLOCK_COLORS: Record<BlockType, { bg: string; border: string; selected: string; selectedBorder: string }> = {
    video: { bg: 'bg-blue-900/60', border: 'border-blue-800', selected: 'bg-blue-800', selectedBorder: 'border-blue-500' },
    image: { bg: 'bg-emerald-900/60', border: 'border-emerald-800', selected: 'bg-emerald-800', selectedBorder: 'border-emerald-500' },
    text: { bg: 'bg-amber-900/60', border: 'border-amber-800', selected: 'bg-amber-800', selectedBorder: 'border-amber-500' },
    audio: { bg: 'bg-purple-900/60', border: 'border-purple-800', selected: 'bg-purple-800', selectedBorder: 'border-purple-500' },
};

export function Timeline() {
    const {
        template,
        currentTime,
        setCurrentTime,
        isPlaying,
        setIsPlaying,
        selectedBlockId,
        selectBlock,
        addBlock,
        setPlaceholder
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
            const rect = timelineRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const scrollLeft = timelineRef.current.scrollLeft;
            const time = Math.max(0, (x + scrollLeft) / PIXELS_PER_SECOND);

            const y = e.clientY - rect.top;
            const trackIndex = Math.floor((y - 30) / 45);
            const track = Math.max(0, trackIndex);

            if (parsed.type === 'library') {
                // Library item (generic block type)
                const blockType = parsed.blockType as BlockType;
                const newBlock: Block = {
                    id: uuidv4(),
                    type: blockType,
                    track: track,
                    start: time,
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
                // Uploaded asset
                const asset = parsed.payload as Asset;
                const shortId = uuidv4().slice(0, 8);
                const placeholderName = `${asset.type}_${shortId}`;

                setPlaceholder(placeholderName, asset.id);

                const duration = asset.type === 'video' ? 5 : asset.type === 'audio' ? 5 : 3;
                const newBlock: Block = {
                    id: uuidv4(),
                    type: asset.type === 'audio' ? 'audio' : asset.type === 'video' ? 'video' : 'image',
                    track: track,
                    start: time,
                    duration: duration,
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
    const totalWidth = maxDuration * PIXELS_PER_SECOND + 200;

    // Determine how many tracks exist
    const maxTrack = Math.max(0, ...template.timeline.map(b => b.track));

    return (
        <div className="flex flex-col h-full bg-neutral-900 border-t border-neutral-800">
            {/* Toolbar */}
            <div className="h-10 border-b border-neutral-800 flex items-center px-4 gap-2 bg-neutral-900 shrink-0">
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
                    className="relative min-h-full"
                    style={{ width: totalWidth, minHeight: Math.max(200, (maxTrack + 2) * 45 + 40) }}
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
                        {template.timeline.map((block) => {
                            const colors = BLOCK_COLORS[block.type] || BLOCK_COLORS.video;
                            const isSelected = selectedBlockId === block.id;
                            return (
                                <div
                                    key={block.id}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        selectBlock(block.id);
                                    }}
                                    className={cn(
                                        "absolute h-10 rounded border text-xs flex items-center px-2 py-1 cursor-pointer select-none overflow-hidden transition-colors",
                                        isSelected
                                            ? `${colors.selected} ${colors.selectedBorder} text-white z-10 shadow-lg`
                                            : `${colors.bg} ${colors.border} text-neutral-300 hover:brightness-125`
                                    )}
                                    style={{
                                        left: block.start * PIXELS_PER_SECOND,
                                        width: Math.max(block.duration * PIXELS_PER_SECOND, 30),
                                        top: 30 + (block.track * 45)
                                    }}
                                >
                                    <span className="truncate font-medium">
                                        {block.type === 'text' ? (block.text?.slice(0, 20) || 'Text') : `${block.type}`}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
