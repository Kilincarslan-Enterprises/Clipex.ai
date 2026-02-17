export type BlockType = 'video' | 'text' | 'image' | 'audio';

// ── Animation Types ─────────────────────────────────────
export type AnimationType =
  | 'shake'
  | 'fade_in'
  | 'fade_out'
  | 'slide_in'
  | 'slide_out'
  | 'scale'
  | 'rotate'
  | 'bounce'
  | 'pulse';

export type AnimationEasing = 'linear' | 'ease_in' | 'ease_out' | 'ease_in_out' | 'bounce';

export type SlideDirection = 'left' | 'right' | 'top' | 'bottom';
export type RotateDirection = 'cw' | 'ccw';

export interface Animation {
  id: string;                    // Unique ID for this animation instance
  type: AnimationType;
  time: number;                  // Start time relative to the block's start (seconds)
  duration: number;              // Duration of the animation (seconds)
  easing?: AnimationEasing;      // Easing function (default: 'ease_in_out')

  // Shake
  strength?: number;             // Pixel displacement (default: 10)
  frequency?: number;            // Oscillations per second (default: 8)

  // Slide In / Slide Out
  direction?: SlideDirection;    // Direction (default: 'left')

  // Scale
  startScale?: number;           // Starting scale factor (default: 0 for scale-in, 1 for scale-out)
  endScale?: number;             // Ending scale factor (default: 1 for scale-in, 0 for scale-out)

  // Rotate
  angle?: number;                // Total rotation angle in degrees (default: 360)
  rotateDirection?: RotateDirection; // Rotation direction (default: 'cw')

  // Bounce / Pulse
  // strength is reused: how intense the effect is (default: 20 for bounce, 0.2 for pulse)
  // frequency is reused: how many cycles (default: 3 for bounce, 2 for pulse)
}

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
  // Animations
  animations?: Animation[];
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
