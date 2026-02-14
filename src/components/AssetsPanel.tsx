'use client';

import { useStore } from '@/lib/store';
import { Block, BlockType } from '@/types';
import { Video, Image, Type, Music } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

// Library items that can be dragged onto the timeline
const LIBRARY_ITEMS: { type: BlockType; label: string; icon: typeof Video; color: string; gradient: string }[] = [
    { type: 'video', label: 'Video', icon: Video, color: 'text-blue-400', gradient: 'from-blue-500/20 to-blue-600/5' },
    { type: 'image', label: 'Image', icon: Image, color: 'text-emerald-400', gradient: 'from-emerald-500/20 to-emerald-600/5' },
    { type: 'text', label: 'Text', icon: Type, color: 'text-amber-400', gradient: 'from-amber-500/20 to-amber-600/5' },
    { type: 'audio', label: 'Music', icon: Music, color: 'text-purple-400', gradient: 'from-purple-500/20 to-purple-600/5' },
];

export function AssetsPanel() {
    const { addBlock, currentTime } = useStore();

    const handleDragStartLibrary = (e: React.DragEvent, blockType: BlockType) => {
        e.dataTransfer.setData('application/json', JSON.stringify({
            type: 'library',
            blockType: blockType
        }));
    };

    const handleLibraryClick = (blockType: BlockType) => {
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
    };

    return (
        <div className="flex flex-col gap-4 h-full">
            {/* Library Section */}
            <div>
                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3 px-1">Add to Timeline</h3>
                <div className="grid grid-cols-2 gap-2">
                    {LIBRARY_ITEMS.map((item) => {
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.type}
                                draggable
                                onDragStart={(e) => handleDragStartLibrary(e, item.type)}
                                onClick={() => handleLibraryClick(item.type)}
                                className={`group flex flex-col items-center gap-1.5 p-3 rounded-lg bg-gradient-to-b ${item.gradient} border border-neutral-800 hover:border-neutral-600 cursor-grab active:cursor-grabbing transition-all hover:scale-[1.03] active:scale-95`}
                            >
                                <Icon size={20} className={item.color} />
                                <span className="text-xs font-medium text-neutral-300 group-hover:text-white transition-colors">
                                    {item.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <hr className="border-neutral-800" />

            {/* Info hint */}
            <div className="text-center text-neutral-600 text-xs py-3 px-2">
                <p className="text-neutral-500 font-medium mb-1">URL-Based Workflow</p>
                <p>Add a block to the timeline, then paste a direct URL in the Properties panel to load your media.</p>
            </div>
        </div>
    );
}
