export type ViewMode = "setup" | "gallery" | "details" | "vault";

export interface ClipMetadata {
  filename: string;
  path: string;
  url: string;
  title: string;
  description: string;
  virality_score: number;
  created_at: number;
  size_mb: number;
  folder: string;
}

export interface EngineOption {
  id: string;
  name: string;
  desc: string;
  category: "text-to-video" | "video-to-video" | "general";
  badge?: string;
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

export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const clean = url.trim();
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = clean.match(regExp);
  return match && match[1] ? match[1] : null;
}
