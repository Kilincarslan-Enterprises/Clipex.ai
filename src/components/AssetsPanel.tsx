'use client';

import { useStore } from '@/lib/store';
import { Asset, Block, BlockType } from '@/types';
import { Upload, Trash2, Video, Image, Type, Music, GripVertical } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useRef } from 'react';

// Library items that can be dragged onto the timeline
const LIBRARY_ITEMS: { type: BlockType; label: string; icon: typeof Video; color: string; gradient: string }[] = [
    { type: 'video', label: 'Video', icon: Video, color: 'text-blue-400', gradient: 'from-blue-500/20 to-blue-600/5' },
    { type: 'image', label: 'Image', icon: Image, color: 'text-emerald-400', gradient: 'from-emerald-500/20 to-emerald-600/5' },
    { type: 'text', label: 'Text', icon: Type, color: 'text-amber-400', gradient: 'from-amber-500/20 to-amber-600/5' },
    { type: 'audio', label: 'Music', icon: Music, color: 'text-purple-400', gradient: 'from-purple-500/20 to-purple-600/5' },
];

export function AssetsPanel() {
    const { assets, addAsset, removeAsset, addBlock, currentTime } = useStore();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        for (const file of Array.from(files)) {
            const isVideo = file.type.startsWith('video/');
            const isImage = file.type.startsWith('image/');
            const isAudio = file.type.startsWith('audio/');

            if (!isVideo && !isImage && !isAudio) continue;

            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) throw new Error('Upload failed');

                const data = await response.json();

                const asset: Asset = {
                    id: uuidv4(),
                    name: file.name,
                    type: isVideo ? 'video' : isAudio ? 'audio' : 'image',
                    url: data.url,
                    file: file,
                };

                addAsset(asset);
            } catch (err) {
                console.error("Upload error", err);
                alert(`Failed to upload ${file.name}`);
            }
        }

        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleDragStartAsset = (e: React.DragEvent, asset: Asset) => {
        e.dataTransfer.setData('application/json', JSON.stringify({
            type: 'asset',
            payload: asset
        }));
    };

    const handleDragStartLibrary = (e: React.DragEvent, blockType: BlockType) => {
        e.dataTransfer.setData('application/json', JSON.stringify({
            type: 'library',
            blockType: blockType
        }));
    };

    const handleLibraryClick = (blockType: BlockType) => {
        // Directly add a block to the timeline at the current playhead position
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

            {/* Upload Section */}
            <div>
                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3 px-1">Your Assets</h3>
                <div
                    className="border-2 border-dashed border-neutral-700 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:border-neutral-500 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <Upload className="w-6 h-6 text-neutral-500 mb-1" />
                    <span className="text-xs text-neutral-500 font-medium">Upload Files</span>
                    <span className="text-[10px] text-neutral-600 mt-0.5">Video, Image, or Audio</span>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="video/*,image/*,audio/*"
                        multiple
                        className="hidden"
                        onChange={handleFileChange}
                    />
                </div>
            </div>

            {/* Uploaded Assets List */}
            <div className="flex flex-col gap-1.5 overflow-y-auto flex-1">
                {assets.map((asset) => (
                    <div
                        key={asset.id}
                        draggable
                        onDragStart={(e) => handleDragStartAsset(e, asset)}
                        className="group flex items-center gap-2 p-2 rounded-md bg-neutral-800 hover:bg-neutral-750 cursor-grab active:cursor-grabbing border border-transparent hover:border-neutral-700"
                    >
                        <GripVertical size={14} className="text-neutral-600 shrink-0" />
                        <div className="w-8 h-8 bg-black rounded flex items-center justify-center overflow-hidden shrink-0">
                            {asset.type === 'video' ? (
                                <video src={asset.url} className="w-full h-full object-cover" />
                            ) : asset.type === 'audio' ? (
                                <Music size={14} className="text-purple-400" />
                            ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs truncate text-neutral-200">{asset.name}</p>
                            <p className="text-[10px] text-neutral-500 capitalize">{asset.type}</p>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                removeAsset(asset.id);
                            }}
                            className="p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ))}
                {assets.length === 0 && (
                    <div className="text-center text-neutral-600 text-xs py-3">
                        No assets uploaded yet
                    </div>
                )}
            </div>
        </div>
    );
}
