import { create } from 'zustand';
import { Template, Block, Asset } from '@/types';
import { supabase } from './supabase';
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

    // DB
    projectId: string | null;
    projectName: string;
    setProject: (id: string, name: string) => void;
    saveProject: () => Promise<void>;
    loadProject: (id: string) => Promise<void>;
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
    projectId: null,
    projectName: 'Untitled Project',

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

    setProject: (id, name) => set({ projectId: id, projectName: name }),

    saveProject: async () => {
        const state = useStore.getState();
        if (!state.projectId) return;

        // Persist local state (assets/placeholders) in JSON
        const payload = {
            ...state.template,
            assets: state.assets,
            placeholders: state.placeholders
        };

        const { error } = await supabase
            .from('projects')
            .update({
                data: payload,
                updated_at: new Date().toISOString()
            })
            .eq('id', state.projectId);

        if (error) console.error("Save error", error);
    },

    loadProject: async (id) => {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error("Load error", error);
            return;
        }

        if (data) {
            const payload = data.data as any;

            // Extract assets/placeholders
            const assets = Array.isArray(payload.assets) ? payload.assets : [];
            const placeholders = payload.placeholders || {};

            // Reconstruct template 
            const template: Template = {
                canvas: payload.canvas || DEFAULT_TEMPLATE.canvas,
                timeline: payload.timeline || []
            };

            set({
                projectId: data.id,
                projectName: data.name,
                template: template,
                assets: assets,
                placeholders: placeholders
            });
        }
    }
}));
