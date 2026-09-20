export type ViewMode = "setup" | "gallery" | "details" | "vault";

export interface ViralitySubScores {
  hook: number;
  flow: number;
  value: number;
  trend: number;
}

export interface ClipMetadata {
  filename: string;
  path: string;
  url: string;
  title: string;
  description: string;
  virality_score: number;
  sub_scores?: ViralitySubScores;
  hook_type?: string;
  reason?: string;
  transcription_confidence?: number;
  created_at: number;
  size_mb: number;
  folder: string;
  start?: number;
  end?: number;
  duration?: number;
  source_title?: string;
  source_url?: string;
  clip_index?: number;
}

export interface EngineOption {
  id: string;
  name: string;
  desc: string;
  category: "local-hardware" | "ultra-fast" | "frontier-llm" | "video-gen" | "text-to-video" | "video-to-video" | "general";
  badge?: string;
  providerType?: "local" | "cloud";
  isHardware?: boolean;
}

export interface CaptionStyleOption {
  id: string;
  name: string;
  desc: string;
  preview: string;
  color: string;
}

export interface CropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CustomSegment {
  id: string;
  start: string;
  end: string;
}

export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const clean = url.trim();
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = clean.match(regExp);
  return match && match[1] ? match[1] : null;
}

export function parseTimestampToSec(ts: string): number {
  if (!ts) return 0;
  const parts = ts.trim().split(":").map(Number);
  if (parts.some(isNaN)) return 0;
  const p0 = parts[0] ?? 0;
  const p1 = parts[1] ?? 0;
  const p2 = parts[2] ?? 0;
  if (parts.length === 3) return p0 * 3600 + p1 * 60 + p2;
  if (parts.length === 2) return p0 * 60 + p1;
  if (parts.length === 1) return p0;
  return 0;
}

export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}


