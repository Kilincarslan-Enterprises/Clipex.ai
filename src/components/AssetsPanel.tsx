'use client';

import { useStore } from '@/lib/store';
import { Asset } from '@/types';
import { Upload, FileVideo, FileImage, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useRef } from 'react';

export function AssetsPanel() {
    const { assets, addAsset, removeAsset } = useStore();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        for (const file of Array.from(files)) {
            const isVideo = file.type.startsWith('video/');
            const isImage = file.type.startsWith('image/');

            if (!isVideo && !isImage) continue;

            // Optimistic logic: Show local preview immediately?
            // Or wait for upload?
            // User might want to use it immediately.
            // But we need server URL for rendering.
            // Let's upload first to keep data consistent.

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
                    type: isVideo ? 'video' : 'image',
                    url: data.url, // storage path
                    file: file, // Keep file for potential fallback
                };

                addAsset(asset);
            } catch (err) {
                console.error("Upload error", err);
                alert(`Failed to upload ${file.name}`);
            }
        }

        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleDragStart = (e: React.DragEvent, asset: Asset) => {
        e.dataTransfer.setData('application/json', JSON.stringify({
            type: 'asset',
            payload: asset
        }));
    };

    return (
        <div className="flex flex-col gap-4 h-full">
            <div
                className="border-2 border-dashed border-neutral-700 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-neutral-500 transition-colors"
                onClick={() => fileInputRef.current?.click()}
            >
                <Upload className="w-8 h-8 text-neutral-500 mb-2" />
                <span className="text-sm text-neutral-500 font-medium">Upload Assets</span>
                <span className="text-xs text-neutral-600 mt-1">Video or Image</span>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*,image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                />
            </div>

            <div className="flex flex-col gap-2 overflow-y-auto flex-1">
                {assets.map((asset) => (
                    <div
                        key={asset.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, asset)}
                        className="group flex items-center gap-3 p-2 rounded-md bg-neutral-800 hover:bg-neutral-750 cursor-grab active:cursor-grabbing border border-transparent hover:border-neutral-700"
                    >
                        <div className="w-10 h-10 bg-black rounded flex items-center justify-center overflow-hidden shrink-0">
                            {asset.type === 'video' ? (
                                <video src={asset.url} className="w-full h-full object-cover" />
                            ) : (
                                <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm truncate text-neutral-200">{asset.name}</p>
                            <p className="text-xs text-neutral-500 capitalize">{asset.type}</p>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                removeAsset(asset.id);
                            }}
                            className="p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
                {assets.length === 0 && (
                    <div className="text-center text-neutral-600 text-sm py-4">
                        No assets yet
                    </div>
                )}
            </div>
        </div>
    );
}
