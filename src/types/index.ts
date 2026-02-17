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
  source?: string; // URL
  text?: string; // Text content
  // Style
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
  // Audio
  volume?: number; // 0-100
  loop?: boolean;
  // API Dynamic Fields
  dynamicId?: string; // User-defined ID for API targeting (e.g. "image_1", "product_shot")
  dynamicFields?: string[]; // List of property names marked as dynamic (e.g. ["source", "duration"])
  // Subtitles (Text blocks only)
  subtitleEnabled?: boolean; // Enable automatic subtitles for this block
  subtitleSource?: string; // VTT content string, URL to .vtt
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
  duration?: number; // Total template duration in seconds (optional, can be dynamic)
}

// Dynamic fields that can be set at the template (canvas) level
export interface TemplateDynamic {
  dynamicFields?: string[]; // e.g. ["duration"]
}

export interface Template {
  canvas: CanvasSettings;
  timeline: Block[];
  dynamic?: TemplateDynamic; // Template-level dynamic fields
}

export interface Asset {
  id: string;
  name: string;
  type: 'video' | 'image' | 'audio';
  url: string;
  file?: File; // For local preview
}
