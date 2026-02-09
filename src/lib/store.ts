import { create } from 'zustand';
import { Template, Block, Asset } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface StoreState {
    template: Template;
    selectedBlockId: string | null;
    assets: Asset[];
    placeholders: Record<string, string | null>; // placeholder ({{video_1}}) -> assetId
    currentTime: number;
    isPlaying: boolean;

    // Actions
    setTemplate: (template: Template) => void;
    updateBlock: (id: string, updates: Partial<Block>) => void;
    addBlock: (block: Block) => void;
    removeBlock: (id: string) => void;
    selectBlock: (id: string | null) => void;
    addAsset: (asset: Asset) => void;
    removeAsset: (id: string) => void;
    setPlaceholder: (name: string, assetId: string | null) => void;
    setCurrentTime: (time: number) => void;
    setIsPlaying: (isPlaying: boolean) => void;
}

const DEFAULT_TEMPLATE: Template = {
    canvas: {
        width: 1080,
        height: 1920,
        fps: 30,
    },
    timeline: [],
};

export const useStore = create<StoreState>((set) => ({
    template: DEFAULT_TEMPLATE,
    selectedBlockId: null,
    assets: [],
    placeholders: {},
    currentTime: 0,
    isPlaying: false,

    setTemplate: (template) => set({ template }),

    updateBlock: (id, updates) =>
        set((state) => ({
            template: {
                ...state.template,
                timeline: state.template.timeline.map((b) =>
                    b.id === id ? { ...b, ...updates } : b
                ),
            },
        })),

    addBlock: (block) =>
        set((state) => ({
            template: {
                ...state.template,
                timeline: [...state.template.timeline, block],
            },
            selectedBlockId: block.id,
        })),

    removeBlock: (id) =>
        set((state) => ({
            template: {
                ...state.template,
                timeline: state.template.timeline.filter((b) => b.id !== id),
            },
            selectedBlockId: state.selectedBlockId === id ? null : state.selectedBlockId,
        })),

    selectBlock: (id) => set({ selectedBlockId: id }),

    addAsset: (asset) =>
        set((state) => ({ assets: [...state.assets, asset] })),

    removeAsset: (id) =>
        set((state) => ({ assets: state.assets.filter((a) => a.id !== id) })),

    setPlaceholder: (name, assetId) =>
        set((state) => ({
            placeholders: { ...state.placeholders, [name]: assetId }
        })),

    setCurrentTime: (time) => set({ currentTime: time }),
    setIsPlaying: (isPlaying) => set({ isPlaying }),
}));
