export type BlockType = 'video' | 'text' | 'image';

export interface Block {
  id: string;
  type: BlockType;
  track: number; // Vertical stacking order
  start: number; // seconds
  duration: number; // seconds
  // Position & Dimensions
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  // Content
  source?: string; // URL or placeholder {{video_1}}
  text?: string; // Content or placeholder {{text_1}}
  // Style
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
}

export interface CanvasSettings {
  width: number;
  height: number;
  fps: number;
}

export interface Template {
  canvas: CanvasSettings;
  timeline: Block[];
}

export interface Asset {
  id: string;
  name: string;
  type: 'video' | 'image';
  url: string;
  file?: File; // For local preview
}
