export type BlockType = 'video' | 'text' | 'image' | 'audio';

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
  // Audio
  volume?: number; // 0-100
  loop?: boolean;
  // Dynamic / Placeholder flag
  isDynamic?: boolean; // If true, source or text is a {{placeholder}} that gets filled via API
  // API Dynamic Fields
  dynamicId?: string; // User-defined ID for API targeting (e.g. "image_1", "product_shot")
  dynamicFields?: string[]; // List of property names marked as dynamic (e.g. ["source", "duration"])
  // Subtitles
  subtitleEnabled?: boolean; // Enable automatic subtitles for this block
  subtitleSource?: string; // VTT content string, URL to .vtt, or placeholder {{subtitle_1}}
  subtitleStyleId?: string; // ID of a text block to copy style from (fontSize, color, bg)
}

export interface SubtitleCue {
  start: number; // seconds
  end: number; // seconds
  text: string;
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
  type: 'video' | 'image' | 'audio';
  url: string;
  file?: File; // For local preview
}
