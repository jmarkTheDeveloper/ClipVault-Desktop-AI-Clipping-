
// ─── TYPES ───────────────────────────────────────────────────────────────────
export type Screen = "login" | "home" | "editor";

export interface CropBox { x: number; y: number; width: number; height: number; }

export interface VideoClip {
  id: number; type: "video"; mediaId: number;
  name: string; thumb: string; url?: string; audioUrl?: string;
  startTime: number; duration: number;
  opacity: number; scaleX: number; scaleY: number;
  rotation: number; x: number; y: number;
  flipH: boolean; flipV: boolean; blendMode: string;
  filterPreset: string; speed: number; volume: number;
  brightness: number; contrast: number; saturation: number;
  exposure: number; highlights: number; shadows: number;
  temperature: number; tint: number; sharpness: number; vignette: number;
  animIn: string; animOut: string;
  cropTop: CropBox; cropMiddle: CropBox; cropBottom: CropBox;
  track?: number;
}

export interface AudioClip {
  id: number; type: "audio";
  name: string; artist: string; url?: string;
  startTime: number; duration: number; volume: number;
  track?: number;
}

export interface TextClip {
  id: number; type: "text";
  text: string; startTime: number; duration: number;
  x: number; y: number; fontSize: number;
  color: string; fontWeight: string; fontStyle: string;
  fontFamily?: string;
  animIn: string; animOut: string;
  track?: number;
}

export const GOOGLE_FONTS = [
  "Inter", "Roboto", "Open Sans", "Montserrat", "Lato", "Poppins", 
  "Oswald", "Raleway", "Nunito", "Ubuntu", "Playfair Display", 
  "Rubik", "Merriweather", "Work Sans", "Lora", "Bebas Neue"
];

export type AnyClip = VideoClip | AudioClip | TextClip;
export type SelectedType = "video" | "audio" | "text" | null;

export interface EditorState {
  clips: VideoClip[];
  audioClips: AudioClip[];
  textClips: TextClip[];
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
export const G = "#00e676";

const DEFAULT_MEDIA: any[] = [];
const DEFAULT_AUDIO: any[] = [];

const loadLib = (key: string, defaultVal: any[]) => {
  try {
    const s = localStorage.getItem(key);
    if (s) {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch(e) {}
  return defaultVal;
};

export const MEDIA_LIBRARY: any[] = loadLib('clipvault_media', DEFAULT_MEDIA);
export const AUDIO_LIBRARY: any[] = loadLib('clipvault_audio', DEFAULT_AUDIO);

export function saveLibraries() {
  localStorage.setItem('clipvault_media', JSON.stringify(MEDIA_LIBRARY));
  localStorage.setItem('clipvault_audio', JSON.stringify(AUDIO_LIBRARY));
}

export const FILTER_PRESETS = [
  { id: "none", name: "Normal", css: "" },
  { id: "noir", name: "Noir", css: "grayscale(1)" },
  { id: "cool", name: "Cool", css: "hue-rotate(20deg) saturate(0.8)" },
  { id: "warm", name: "Warm", css: "sepia(0.3) saturate(1.2)" },
  { id: "cinematic", name: "Cinematic", css: "contrast(1.1) saturate(0.9) brightness(0.95)" },
  { id: "fade", name: "Fade", css: "saturate(0.6) brightness(1.1)" },
  { id: "vivid", name: "Vivid", css: "saturate(1.5) contrast(1.05)" },
  { id: "matte", name: "Matte", css: "contrast(0.9) saturate(0.7) brightness(1.1)" },
];

export const ANIM_IN_OPTIONS = ["None", "Fade In", "Slide Left", "Zoom In", "Bounce", "Rotate In"];
export const ANIM_OUT_OPTIONS = ["None", "Fade Out", "Slide Right", "Zoom Out", "Shrink", "Rotate Out"];

export function makeVideoClip(mediaArg: number | any, startTime: number): VideoClip {
  const media = typeof mediaArg === "object" ? mediaArg : (MEDIA_LIBRARY.find((m) => m.id === mediaArg) || {
    id: mediaArg || Date.now(),
    name: "Video Clip",
    thumb: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=225&fit=crop&auto=format",
    duration: 10,
    url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
  });

  return {
    id: Date.now() + Math.random(),
    type: "video",
    mediaId: media.id,
    name: media.name || "Video Clip",
    thumb: media.thumb || "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=225&fit=crop&auto=format",
    url: media.url || "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    startTime,
    duration: media.duration || 10,
    opacity: 100, scaleX: 1, scaleY: 1, rotation: 0, x: 0, y: 0,
    flipH: false, flipV: false, blendMode: "normal",
    filterPreset: "none", speed: 1, volume: 100,
    brightness: 0, contrast: 0, saturation: 0, exposure: 0,
    highlights: 0, shadows: 0, temperature: 0, tint: 0, sharpness: 0, vignette: 0,
    animIn: "None", animOut: "None",
    cropTop: { x: 20, y: 10, width: 200, height: 200 },
    cropMiddle: { x: 20, y: 130, width: 200, height: 200 },
    cropBottom: { x: 20, y: 250, width: 200, height: 200 },
    track: 0,
  };
}

export const makeAudioClip = (st: number, mediaArg?: any): AudioClip => {
  const media = typeof mediaArg === "object" ? mediaArg : (AUDIO_LIBRARY.find((m) => m.id === mediaArg) || {
    id: mediaArg || Date.now(),
    name: "Background Music",
    artist: "Audio Track",
    duration: 15,
    url: ""
  });

  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    type: "audio",
    name: media.name || "Background Music",
    artist: media.artist || "Audio Track",
    url: media.url || "",
    startTime: st,
    duration: media.duration || 15,
    volume: 80,
    track: 2,
  };
};

export const makeTextClip = (st: number): TextClip => ({
  id: Date.now() + Math.floor(Math.random() * 1000),
  type: "text", text: "New Text",
  startTime: st, duration: 3,
  x: 50, y: 50, fontSize: 32,
  color: "#ffffff", fontWeight: "700", fontStyle: "normal",
  fontFamily: "Inter",
  animIn: "none", animOut: "none",
  track: 1,
});

export const INITIAL_STATE: EditorState = {
  clips: [],
  audioClips: [],
  textClips: [],
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
export function buildFilterCSS(clip: VideoClip): string {
  const preset = FILTER_PRESETS.find((f) => f.id === clip.filterPreset);
  const parts: string[] = [];
  if (clip.brightness) parts.push(`brightness(${1 + clip.brightness / 100})`);
  if (clip.contrast) parts.push(`contrast(${1 + clip.contrast / 100})`);
  if (clip.saturation) parts.push(`saturate(${1 + clip.saturation / 100})`);
  if (clip.temperature) parts.push(`hue-rotate(${clip.temperature * 0.5}deg)`);
  if (clip.exposure) parts.push(`brightness(${1 + clip.exposure / 100})`);
  if (preset?.css) parts.push(preset.css);
  return parts.join(" ") || "none";
}

export function buildTransformCSS(clip: VideoClip): string {
  const parts: string[] = [];
  if (clip.flipH) parts.push("scaleX(-1)");
  if (clip.flipV) parts.push("scaleY(-1)");
  if (clip.rotation) parts.push(`rotate(${clip.rotation}deg)`);
  if (clip.scaleX !== 1 || clip.scaleY !== 1) parts.push(`scale(${clip.scaleX},${clip.scaleY})`);
  return parts.join(" ") || "none";
}

export const fmt = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;


