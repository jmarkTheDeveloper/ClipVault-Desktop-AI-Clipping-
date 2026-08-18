import React, { useState, useRef, useEffect } from "react";
import {
  ArrowLeft, Link2, Play, Pause, Zap, Check, ChevronDown, ChevronUp,
  Loader2, Smartphone, Download, ExternalLink, Sparkles, Volume2, VolumeX, RefreshCw, Type, Music, Palette, Move, Sliders, Cpu, CheckCircle2, RotateCcw, RotateCw, Upload, Maximize, Copyright,
  Folder, FolderOpen, FolderPlus, FolderCheck, HardDrive, Search, Trash2, Filter,
  Plus, CheckSquare, Square, ArrowRight
} from "lucide-react";
import { Rnd } from "react-rnd";

interface Props { onBack: () => void; onOpenEditor?: (url: string) => void; }

const DEFAULT_ENGINE = { id: "higgsfield", name: "Higgsfield AI", provider: "Higgsfield", desc: "Best for Cinematic Camera Motion & Video" };

const AI_ENGINES = [
  { id: "claude_fable", name: "Claude Fable", provider: "Anthropic", desc: "Best for Viral Hooks & Scriptwriting" },
  { id: "higgsfield", name: "Higgsfield AI", provider: "Higgsfield", desc: "Best for Cinematic Camera Motion & Video" },
  { id: "seedance", name: "SeeDance AI", provider: "ByteDance", desc: "Best for Music Beat Sync & Dance Clips" },
  { id: "openai_sora", name: "OpenAI Sora / GPT-4o", provider: "OpenAI", desc: "General Video & Subtitle Model" },
];

const LAYOUTS = [
  { id: "vertical_crop", label: "Vertical Crop (9:16)", desc: "Fills vertical screen — best for TikTok/Reels" },
  { id: "landscape_fit", label: "Landscape Fit (9:16)", desc: "Original width with black bars top & bottom" },
  { id: "landscape_blur", label: "Blurred Background (9:16)", desc: "Full width centered with blurred zoomed bg" },
  { id: "custom_split", label: "Custom Split (9:16)", desc: "Free-form stack (Streamer or Podcast)" },
];

const QUALITIES = [
  { id: "720p", label: "720p — Fast Processing", desc: "5-10x faster processing (Recommended)" },
  { id: "1080p", label: "1080p — High Quality", desc: "Slower downloads, crisp resolution" },
  { id: "4k", label: "4K — Ultra HD", desc: "Very slow downloads, maximum crispness" },
  { id: "8k", label: "8K — Extreme HD", desc: "Extreme downloads, hardware intensive" },
];

// Absolute Best Fonts (20 Dropdown Options)
const VIRAL_FONTS = [
  { id: "Impact, sans-serif", label: "Impact (Classic Viral Reel)" },
  { id: "'Montserrat', sans-serif", label: "Montserrat (Heavy Bold)" },
  { id: "'Outfit', sans-serif", label: "Outfit (Modern Clean)" },
  { id: "'Bebas Neue', sans-serif", label: "Bebas Neue (Heavy Punch)" },
  { id: "'Anton', sans-serif", label: "Anton (High Contrast)" },
  { id: "'Permanent Marker', cursive", label: "Permanent Marker (Comic Style)" },
  { id: "'Roboto', sans-serif", label: "Roboto (Clean Sans)" },
  { id: "'Inter', sans-serif", label: "Inter (Standard Pro)" },
  { id: "'Poppins', sans-serif", label: "Poppins (Geometric Bold)" },
  { id: "'Oswald', sans-serif", label: "Oswald (Condensed Heavy)" },
  { id: "'Cinematic Sans', sans-serif", label: "Cinematic Subtitles" },
  { id: "'Lobster', cursive", label: "Lobster (Handwritten Script)" },
  { id: "'Pacifico', cursive", label: "Pacifico (Trendy Brush)" },
  { id: "'Comic Sans MS', cursive", label: "Comic Accent" },
  { id: "'Trebuchet MS', sans-serif", label: "Trebuchet Display" },
  { id: "'Futura', sans-serif", label: "Futura Heavy" },
  { id: "'Space Grotesk', sans-serif", label: "Space Grotesk (Tech)" },
  { id: "'Syne', sans-serif", label: "Syne (Experimental)" },
  { id: "'Playfair Display', serif", label: "Playfair (Serif Elegance)" },
  { id: "'Courier New', monospace", label: "Retro Monospace" },
];

// Pro Text Effects & Styles (No Trademarks)
const PRO_TEXT_EFFECTS = [
  {
    id: "none",
    label: "No Captions (Clean Video)",
    style: {
      color: "#9ca3af",
      background: "transparent",
      border: "1px dashed rgba(255,255,255,0.2)",
      boxShadow: "none",
      textShadow: "none",
    }
  },
  {
    id: "capcut_banger",
    label: "CapCut Banger (Huge Impact)",
    style: {
      color: "#ffffff",
      background: "transparent",
      border: "3px solid #ff2828", // Simulating the red highlight
      boxShadow: "5px 5px 0px rgba(0,0,0,0.9)", // Drop shadow
      textShadow: "0 4px 10px rgba(0,0,0,0.9)",
    }
  },
  {
    id: "hormozi_bold",
    label: "Hormozi Style (Bold Outline)",
    style: {
      color: "#ffffff",
      background: "transparent",
      border: "4px solid #ffd600", // Yellow highlight
      boxShadow: "0 0 20px rgba(255,214,0,0.4)",
      textShadow: "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 4px 15px rgba(0,0,0,0.9)", // Heavy black outline
    }
  },
  {
    id: "minimal_pop",
    label: "Minimal Pop (Clean Bebas)",
    style: {
      color: "#ffffff",
      background: "transparent",
      border: "1px solid #00ffff", // Cyan highlight
      boxShadow: "none",
      textShadow: "0 2px 5px rgba(0,0,0,0.7)",
    }
  },
  {
    id: "capcut_yellow",
    label: "Classic Gold Yellow",
    style: {
      color: "#ffd600",
      background: "rgba(0,0,0,0.85)",
      border: "2px solid #ffd600",
      boxShadow: "0 0 20px rgba(255,214,0,0.4)",
      textShadow: "0 2px 8px rgba(0,0,0,0.9)",
    }
  },
  {
    id: "tiktok_banner",
    label: "TikTok Black Box Banner",
    style: {
      color: "#ffffff",
      background: "#000000",
      border: "1px solid rgba(255,255,255,0.2)",
      boxShadow: "0 8px 24px rgba(0,0,0,0.8)",
      textShadow: "none",
    }
  },
  {
    id: "neon_cyan",
    label: "Cyberpunk Neon Cyan",
    style: {
      color: "#00e5ff",
      background: "rgba(0,229,255,0.1)",
      border: "2px solid #00e5ff",
      boxShadow: "0 0 25px rgba(0,229,255,0.6)",
      textShadow: "0 0 10px #00e5ff",
    }
  },
  {
    id: "hot_pink",
    label: "Hot Pink Neon",
    style: {
      color: "#f50057",
      background: "rgba(245,0,87,0.15)",
      border: "2px solid #f50057",
      boxShadow: "0 0 25px rgba(245,0,87,0.5)",
      textShadow: "0 0 12px #f50057",
    }
  },
  {
    id: "sigma_pink",
    label: "Red Shock Alert Box",
    style: {
      color: "#ffffff",
      background: "#ff1744",
      border: "2px solid #ffffff",
      boxShadow: "0 0 30px rgba(255,23,68,0.7)",
      textShadow: "0 2px 4px rgba(0,0,0,0.8)",
    }
  },
  {
    id: "lime_green",
    label: "Lime Energy Glow",
    style: {
      color: "#76ff03",
      background: "rgba(0,0,0,0.85)",
      border: "2px solid #76ff03",
      boxShadow: "0 0 20px rgba(118,255,3,0.5)",
      textShadow: "0 0 10px #76ff03",
    }
  },
  {
    id: "bright_yellow",
    label: "Gold Metallic Luxury",
    style: {
      color: "#000000",
      background: "linear-gradient(135deg, #ffe082 0%, #ffb300 100%)",
      border: "2px solid #ffffff",
      boxShadow: "0 0 25px rgba(255,179,0,0.6)",
      textShadow: "none",
    }
  },
  {
    id: "purple_pop",
    label: "Purple Synthwave",
    style: {
      color: "#d500f9",
      background: "rgba(213,0,249,0.15)",
      border: "2px solid #d500f9",
      boxShadow: "0 0 25px rgba(213,0,249,0.6)",
      textShadow: "0 0 12px #d500f9",
    }
  },
  {
    id: "clean_white_sub",
    label: "Minimalist Subtitle White",
    style: {
      color: "#ffffff",
      background: "rgba(0,0,0,0.7)",
      border: "1px solid rgba(255,255,255,0.3)",
      boxShadow: "none",
      textShadow: "0 1px 4px rgba(0,0,0,0.8)",
    }
  },
  {
    id: "electric_blue_shock",
    label: "Electric Blue Shock",
    style: {
      color: "#2979ff",
      background: "rgba(41,121,255,0.15)",
      border: "2px solid #2979ff",
      boxShadow: "0 0 25px rgba(41,121,255,0.6)",
      textShadow: "0 0 10px #2979ff",
    }
  },
];

const DURATION_MODES = [
  { id: "auto", label: "Auto-Detect Highlights", desc: "AI picks the most viral moments" },
  { id: "full", label: "Entire Video", desc: "Process full video into short clip" },
  { id: "custom", label: "Customize Range", desc: "Manually set start & end timestamps" },
];

const DEMO_VIDEOS = [
  "https://www.w3schools.com/html/mov_bbb.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
];

export function AiClipperScreen({ onBack, onOpenEditor }: Props) {
  const [inputType, setInputType] = useState<"youtube" | "local">("youtube");
  const [ytUrl, setYtUrl] = useState("https://www.youtube.com/watch?v=demo_viral_stream");
  const [layout, setLayout] = useState("vertical_crop");
  const [transcriptionLanguage, setTranscriptionLanguage] = useState("auto");
  const [cameraStyle, setCameraStyle] = useState("smooth");
  const [quality, setQuality] = useState("720p");
  const [durationMode, setDurationMode] = useState("auto");
  const [numClips, setNumClips] = useState(3);
  const [startTs, setStartTs] = useState("0:15");
  const [endTs, setEndTs] = useState("1:45");
  const [topicPrompt, setTopicPrompt] = useState("");
  const [generatedClips, setGeneratedClips] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"setup" | "gallery" | "details">("setup");

  // AI Engine & BYOK (Bring Your Own Key) State
  const [selectedEngine, setSelectedEngine] = useState("higgsfield");
  const [byokMode, setByokMode] = useState<"developer" | "custom">("developer");
  const [showKeySettings, setShowKeySettings] = useState(false);

  // BYOK Multi-Key State
  const [anthropicKey, setAnthropicKey] = useState(() => localStorage.getItem("clipvault_anthropic_key") || "");
  const [higgsfieldKey, setHiggsfieldKey] = useState(() => localStorage.getItem("clipvault_higgsfield_key") || "");
  const [seeDanceKey, setSeeDanceKey] = useState(() => localStorage.getItem("clipvault_seedance_key") || "");
  const [openAiKey, setOpenAiKey] = useState(() => localStorage.getItem("clipvault_openai_key") || "");

  useEffect(() => {
    try {
      localStorage.setItem("clipvault_anthropic_key", anthropicKey);
      localStorage.setItem("clipvault_higgsfield_key", higgsfieldKey);
      localStorage.setItem("clipvault_seedance_key", seeDanceKey);
      localStorage.setItem("clipvault_openai_key", openAiKey);
    } catch (e) { }
  }, [anthropicKey, higgsfieldKey, seeDanceKey, openAiKey]);

  // CUSTOM TEXT, DROPDOWN FONTS & EFFECTS STATE
  const [customText, setCustomText] = useState("YOUR VIRAL CAPTION HERE 🚀");
  const [selectedFont, setSelectedFont] = useState("Impact, sans-serif");
  const [selectedEffectId, setSelectedEffectId] = useState("capcut_yellow");
  const [captionYPct, setCaptionYPct] = useState(70); // 70% down by default (lower third)
  
  // CUSTOM STORAGE & OUTPUT FOLDER STATE
  const [customFolderName, setCustomFolderName] = useState("");
  const [customOutputDir, setCustomOutputDir] = useState("");
  const [lastOutputFolder, setLastOutputFolder] = useState("");
  const [exportNotice, setExportNotice] = useState("");

  // VAULT / LIBRARY PERSISTENT STATE
  const [vaultClips, setVaultClips] = useState<any[]>([]);
  const [vaultFolders, setVaultFolders] = useState<string[]>(["Main Library"]);
  const [vaultLoading, setVaultLoading] = useState(false);
  const [vaultSearch, setVaultSearch] = useState("");
  const [vaultSelectedFolder, setVaultSelectedFolder] = useState("all");
  const [previewVaultClip, setPreviewVaultClip] = useState<any | null>(null);

  // FOLDER CREATION & MULTI-SELECT MOVE STATE
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderNameInput, setNewFolderNameInput] = useState("");
  const [selectedClipPaths, setSelectedClipPaths] = useState<string[]>([]);
  const [moveModalClips, setMoveModalClips] = useState<string[] | null>(null);

  // MOUSE DRAG & DROP FOR VIDEO CARDS
  const [draggedClipPath, setDraggedClipPath] = useState<string | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);

  // POST-PROCESSING SELECTIVE GALLERY SORTING STATE
  const [gallerySelectedClips, setGallerySelectedClips] = useState<number[]>([]);
  const [galleryTargetFolder, setGalleryTargetFolder] = useState<string>("");
  const [galleryRandomFolder, setGalleryRandomFolder] = useState<string>("Random & Unsorted Clips");
  const [isSortingGallery, setIsSortingGallery] = useState(false);

  // REAL-TIME FREELY DRAGGABLE CAPTION STATE
  const [isDraggingCaption, setIsDraggingCaption] = useState(false);

  // BYPASS COPYRIGHT STATE
  const [avoidCopyright, setAvoidCopyright] = useState(false);

  // DRAGGABLE TEXT POSITION STATE
  const [textPos, setTextPos] = useState({ x: 20, y: 440 });

  // Video State
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [activeClipIndex, setActiveClipIndex] = useState(0);

  // Processing state
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const intervalRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const phoneContainerRef = useRef<HTMLDivElement>(null);
  const [activeVideoUrl, setActiveVideoUrl] = useState("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4");
  const [localFilePath, setLocalFilePath] = useState("");
  
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(1);

  // Load Vault Clips on mount and whenever vault tab is opened
  const loadVaultClips = async () => {
    setVaultLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/saved_clips");
      if (res.ok) {
        const data = await res.json();
        setVaultClips(data.clips || []);
        if (data.folders) {
          setVaultFolders(data.folders);
        }
        if (data.storage_dir && !lastOutputFolder) {
          setLastOutputFolder(data.storage_dir);
        }
      }
    } catch (err) {
      console.error("Failed to load vault clips:", err);
    } finally {
      setVaultLoading(false);
    }
  };

  const handleCreateFolder = async (name: string) => {
    if (!name.trim()) return;
    try {
      const res = await fetch("http://127.0.0.1:8000/api/create_folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder_name: name.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setVaultFolders(prev => Array.from(new Set([...prev, data.folder_name])));
        setVaultSelectedFolder(data.folder_name);
        setCustomFolderName(data.folder_name);
        setNewFolderNameInput("");
        setShowNewFolderModal(false);
        setExportNotice(`📁 Folder created: "${data.folder_name}"`);
        setTimeout(() => setExportNotice(""), 4000);
        await loadVaultClips();
      }
    } catch (err) {
      console.error("Failed to create folder:", err);
    }
  };

  const handleMoveClips = async (filePaths: string[], targetFolder: string) => {
    if (!filePaths.length || !targetFolder) return;
    try {
      const res = await fetch("http://127.0.0.1:8000/api/move_clips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_paths: filePaths, target_folder: targetFolder })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedClipPaths([]);
        setMoveModalClips(null);
        setExportNotice(`Moved ${data.moved_count} clip(s) to 📁 ${targetFolder}`);
        setTimeout(() => setExportNotice(""), 4000);
        await loadVaultClips();
      }
    } catch (err) {
      console.error("Failed to move clips:", err);
    }
  };

  const deleteVaultClip = async (clipPath: string) => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/delete_clip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: clipPath })
      });
      if (res.ok) {
        setVaultClips(prev => prev.filter(c => c.path !== clipPath));
        setSelectedClipPaths(prev => prev.filter(p => p !== clipPath));
        if (previewVaultClip?.path === clipPath) {
          setPreviewVaultClip(null);
        }
      }
    } catch (err) {
      console.error("Failed to delete clip:", err);
    }
  };

  const handleSortGeneratedClips = async () => {
    if (!generatedClips.length) return;
    setIsSortingGallery(true);
    try {
      const primaryFolder = galleryTargetFolder.trim() || customFolderName.trim() || "Main Library";
      const randomFolder = galleryRandomFolder.trim() || "Random & Unsorted Clips";

      const checkedPaths: string[] = [];
      const uncheckedPaths: string[] = [];

      generatedClips.forEach((clip, idx) => {
        const path = clip.path || (typeof clip === "string" ? clip : "");
        if (!path) return;
        if (gallerySelectedClips.includes(idx)) {
          checkedPaths.push(path);
        } else {
          uncheckedPaths.push(path);
        }
      });

      // Move checked clips to target folder
      if (checkedPaths.length > 0) {
        await fetch("http://127.0.0.1:8000/api/move_clips", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file_paths: checkedPaths, target_folder: primaryFolder })
        });
      }

      // Move unchecked clips to random / unsorted folder
      if (uncheckedPaths.length > 0) {
        await fetch("http://127.0.0.1:8000/api/move_clips", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file_paths: uncheckedPaths, target_folder: randomFolder })
        });
      }

      setExportNotice(`✨ Sorted: ${checkedPaths.length} clips saved to "📁 ${primaryFolder}", ${uncheckedPaths.length} unselected clips routed to "📁 ${randomFolder}"`);
      setTimeout(() => setExportNotice(""), 6000);
      await loadVaultClips();
    } catch (err) {
      console.error("Failed to sort clips:", err);
    } finally {
      setIsSortingGallery(false);
    }
  };

  useEffect(() => {
    loadVaultClips();
  }, []);

  // Instant, rock-solid drag handler for caption box
  const startCaptionDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingCaption(true);

    const onMove = (moveEvent: MouseEvent) => {
      if (!phoneContainerRef.current) return;
      const rect = phoneContainerRef.current.getBoundingClientRect();
      const relativeY = moveEvent.clientY - rect.top;
      const pct = Math.round(Math.max(10, Math.min(90, (relativeY / rect.height) * 100)));
      setCaptionYPct(pct);
    };

    const onUp = () => {
      setIsDraggingCaption(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // Quick Crop State
  const [cropModalOpen, setCropModalOpen] = useState<"none" | "top" | "bottom">("none");
  const [cropTop, setCropTop] = useState({ x: 100, y: 0, width: 144, height: 128 }); 
  const [cropBottom, setCropBottom] = useState({ x: 100, y: 128, width: 144, height: 128 });
  const [splitType, setSplitType] = useState<"same" | "guest">("same");
  const [targetDuration, setTargetDuration] = useState<number | string>(30);
  const [autoBroll, setAutoBroll] = useState(false);
  const [addCaptions, setAddCaptions] = useState(true);
  const [addBgMusic, setAddBgMusic] = useState(true);
  const [bgMusicVol, setBgMusicVol] = useState(0.1);
  const [autoSfx, setAutoSfx] = useState(true);
  const [customBaseUrl, setCustomBaseUrl] = useState("");
  const [exportFileName, setExportFileName] = useState("");

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      if (phoneContainerRef.current) {
        const firstVid = phoneContainerRef.current.querySelector('video');
        if (firstVid) {
          setCurrentTime(firstVid.currentTime);
          setDuration(firstVid.duration || 1);
        }
      }
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying]);

  useEffect(() => {
    if (phoneContainerRef.current) {
      const videos = phoneContainerRef.current.querySelectorAll('video');
      videos.forEach(v => {
        v.muted = isMuted;
      });
    }
  }, [isMuted, done, activeClipIndex, layout]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      // Clean up ALL video elements on screen to release Chromium memory buffers
      const videos = document.querySelectorAll('video');
      videos.forEach(v => {
        v.pause();
        v.removeAttribute('src');
        v.load();
      });
    };
  }, []);

  // DEBOUNCED & VALIDATED YOUTUBE STREAM RESOLVER (Stops keystroke spam & process freeze)
  useEffect(() => {
    if (!ytUrl.trim()) return;
    const isYtFormat = /[?&]v=([^&]+)|youtu\.be\/([^?&]+)/.test(ytUrl);
    if (!isYtFormat) return;

    const timer = setTimeout(() => {
      const controller = new AbortController();
      const fetchTimer = setTimeout(() => controller.abort(), 3000);
      fetch(`http://127.0.0.1:8000/api/video_info?url=${encodeURIComponent(ytUrl)}`, { signal: controller.signal })
        .then(res => res.json())
        .then(data => {
          if (data.url || data.stream_url) {
            setActiveVideoUrl(data.url || data.stream_url);
          }
        })
        .catch(() => {})
        .finally(() => clearTimeout(fetchTimer));
    }, 1200);

    return () => clearTimeout(timer);
  }, [ytUrl]);

  const activeEffect = PRO_TEXT_EFFECTS.find(e => e.id === selectedEffectId) || PRO_TEXT_EFFECTS[0] || { style: { color: "#ffd600" } };

  const runClipper = async () => {
    if (!ytUrl.trim() && inputType === 'youtube') return;
    
    setRunning(true);
    setProgress(0);
    setDone(false);
    setErrorMsg("");
    setStatusText("Initializing AI Processing Engine...");

    try {
      // 1. Submit the task
      // Calculate custom crop box percentages if custom split is used
      let customCropBoxes = undefined;
      if (layout === "custom_split") {
        const containerWidth = 456; // 456px fixed stage width
        const containerHeight = 256; // 256px fixed stage height
        
        customCropBoxes = [
          [
            (cropTop.x / containerWidth) * 100,
            (cropTop.y / containerHeight) * 100,
            (cropTop.width / containerWidth) * 100,
            (cropTop.height / containerHeight) * 100
          ],
          [
            (cropBottom.x / containerWidth) * 100,
            (cropBottom.y / containerHeight) * 100,
            (cropBottom.width / containerWidth) * 100,
            (cropBottom.height / containerHeight) * 100
          ]
        ];
      }

      const parseTime = (timeStr: string) => {
        if (!timeStr) return 0;
        const parts = timeStr.split(':').map(Number);
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        return Number(timeStr) || 0;
      };

      const reqBody = {
        url: inputType === 'youtube' ? ytUrl : (localFilePath || activeVideoUrl),
        duration: durationMode === "auto" ? "auto" : "custom",
        num_clips: durationMode === "auto" ? numClips : 1,
        target_duration: durationMode === "auto" ? (parseInt(targetDuration.toString()) || 30) : -1,
        topic: durationMode === "auto" && topicPrompt.trim() ? topicPrompt : undefined,
        layout: layout,
        transcription_language: transcriptionLanguage,
        custom_range: durationMode === "custom" && startTs && endTs ? [parseTime(startTs), parseTime(endTs)] : undefined,
        quality: quality,
        caption_style: selectedEffectId,
        caption_y_pct: captionYPct / 100,
        ai_engine: selectedEngine,
        auto_broll: autoBroll,
        yt_bypass: avoidCopyright,
        add_bg_music: addBgMusic,
        add_captions: addCaptions,
        auto_sfx: autoSfx,
        bg_music_vol: bgMusicVol,
        custom_base_url: customBaseUrl || undefined,
        custom_file_name: exportFileName || undefined,
        custom_folder_name: customFolderName.trim() || undefined,
        output_dir: customOutputDir.trim() || undefined,
        custom_crop_boxes: customCropBoxes,
        camera_style: cameraStyle
      };

      const res = await fetch("http://127.0.0.1:8000/api/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer dev-token"
        },
        body: JSON.stringify(reqBody)
      });

      if (!res.ok) {
        throw new Error("Failed to start processing task.");
      }

      const data = await res.json();
      const taskId = data.task_id;

      // 2. Poll for status
      intervalRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`http://127.0.0.1:8000/api/status/${taskId}`, {
            headers: { "Authorization": "Bearer dev-token" }
          });
          const statusData = await statusRes.json();
          
          if (statusData.message) {
            setStatusText(statusData.message);
          }
          
          if (statusData.status === "completed") {
            clearInterval(intervalRef.current);
            setProgress(100);
            setDone(true);
            setRunning(false);
            setStatusText("Done! Clips Generated!");
            
            if (statusData.result) {
              if (statusData.result.clips) {
                setGeneratedClips(statusData.result.clips);
                setGallerySelectedClips(statusData.result.clips.map((_: any, idx: number) => idx));
              }
              if (statusData.result.output_folder) setLastOutputFolder(statusData.result.output_folder);
              setViewMode("gallery");
            }
          } else if (statusData.status === "failed") {
            clearInterval(intervalRef.current);
            setRunning(false);
            setErrorMsg(`Error: ${statusData.error}`);
            setStatusText("");
          } else {
            // Use real progress from the backend server
            setProgress(statusData.progress || 0);
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 2000);

    } catch (error: any) {
      setRunning(false);
      setErrorMsg(`Error: ${error.message}`);
      setStatusText("");
    }
  };

  const togglePlay = () => {
    setIsPlaying(prev => {
      const next = !prev;
      if (phoneContainerRef.current) {
        const videos = phoneContainerRef.current.querySelectorAll('video');
        videos.forEach(v => {
          if (prev) {
            v.pause();
          } else {
            v.play().catch(() => {});
          }
        });
      }
      return next;
    });
  };

  const openOutputFolder = async (folderPath?: string) => {
    const target = folderPath || lastOutputFolder || (customOutputDir ? customOutputDir : undefined);
    try {
      if ((window as any).electronAPI?.openPath) {
        if (target) {
          await (window as any).electronAPI.openPath(target);
          return;
        }
      }
      await fetch("http://127.0.0.1:8000/api/open_folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder_path: target || "clips" })
      });
    } catch (err) {
      console.error("Failed to open folder:", err);
    }
  };

  const chooseCustomDirectory = async () => {
    try {
      if ((window as any).electronAPI?.selectDirectory) {
        const selected = await (window as any).electronAPI.selectDirectory(customOutputDir);
        if (selected) {
          setCustomOutputDir(selected);
        }
      }
    } catch (err) {
      console.error("Failed to select directory:", err);
    }
  };

  const openCropModal = (position: "top" | "bottom") => {
    setCropModalOpen(position);
  };

  // Helper to render dynamically cropped video with zero lag GPU compositing
  const renderCroppedVideo = (src: string, crop: {x: number, y: number, width: number, height: number}) => {
    const cropW = Math.max(20, crop.width);
    const cropH = Math.max(20, crop.height);
    const scaleW = 456 / cropW;
    const scaleH = 256 / cropH;
    const leftP = -(crop.x / cropW) * 100;
    const topP = -(crop.y / cropH) * 100;
    
    return (
      <div className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center select-none">
        <video
          src={src}
          autoPlay 
          loop 
          muted={isMuted}
          playsInline
          className="pointer-events-none"
          style={{
            position: 'absolute',
            width: `${scaleW * 100}%`,
            height: `${scaleH * 100}%`,
            maxWidth: 'none',
            maxHeight: 'none',
            left: `${leftP}%`,
            top: `${topP}%`,
            objectFit: 'cover',
            transform: 'translateZ(0)',
            willChange: 'transform'
          }}
        />
      </div>
    );
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input field (like the YouTube URL)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.code === "Space" || e.key === "Backspace") {
        e.preventDefault();
        togglePlay();
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const seekVideo = (amount: number) => {
    if (phoneContainerRef.current) {
      const videos = phoneContainerRef.current.querySelectorAll('video');
      let newTime = 0;
      videos.forEach(v => {
        v.currentTime = Math.max(0, Math.min(v.currentTime + amount, v.duration || 0));
        newTime = v.currentTime;
      });
      setCurrentTime(newTime);
    }
  };

  const onSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (phoneContainerRef.current) {
      const videos = phoneContainerRef.current.querySelectorAll('video');
      videos.forEach(v => {
        v.currentTime = val;
      });
      setCurrentTime(val);
    }
  };

  const setQuickTextPos = (preset: "top" | "middle" | "bottom") => {
    if (preset === "top") setTextPos({ x: 20, y: 70 });
    if (preset === "middle") setTextPos({ x: 20, y: 250 });
    if (preset === "bottom") setTextPos({ x: 20, y: 440 });
  };

  const G2 = "#fbbf24";

  return (
    <div className="h-screen w-screen flex flex-col font-['Inter',sans-serif] overflow-hidden bg-[#050505] select-none">
      {/* Background Glow */}
      <div className="pointer-events-none fixed inset-0 z-0" style={{ background: "radial-gradient(ellipse 50% 40% at 50% 0%, rgba(251,191,36,0.07) 0%, transparent 70%)" }} />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 pt-7 h-20 pr-36 flex-shrink-0 border-b border-white/5 bg-[#050505]/90 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors cursor-pointer">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="w-px h-5 bg-white/10" />
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center bg-gradient-to-r from-amber-400 to-amber-500 shadow-[0_0_15px_rgba(251,191,36,0.4)]">
              <Zap className="w-3.5 h-3.5 text-black" strokeWidth={2.5} />
            </div>
            <span className="text-white font-bold text-base">AI Video Clipper</span>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20">
              🚀 Viral Engine v2
            </span>
          </div>

          {/* Persistent Tab Switchers */}
          <div className="flex items-center bg-black/40 border border-white/10 rounded-xl p-1 ml-2 gap-1">
            <button
              type="button"
              onClick={() => setViewMode("setup")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === "setup"
                  ? "bg-amber-400 text-black shadow-md"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Zap className="w-3.5 h-3.5" /> Clipper Studio
            </button>
            <button
              type="button"
              onClick={() => {
                loadVaultClips();
                setViewMode("vault");
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === "vault"
                  ? "bg-amber-400 text-black shadow-md"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <FolderCheck className="w-3.5 h-3.5 text-amber-400" /> Saved Clips Vault
              {vaultClips.length > 0 && (
                <span className="text-[10px] bg-white/15 px-1.5 py-0.2 rounded-full font-extrabold ml-0.5">
                  {vaultClips.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* AI ENGINE & BYOK KEY SELECTOR BADGE */}
        <div className="flex items-center gap-3">
          {done && (
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00e676] text-black font-bold text-xs hover:brightness-110 transition-all cursor-pointer shadow-[0_0_20px_rgba(0,230,118,0.3)]">
                <Download className="w-4 h-4" strokeWidth={2.5} />
                Export {quality.toUpperCase()}
              </button>
            </div>
          )}
          <button
            onClick={() => setShowKeySettings(!showKeySettings)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-amber-400/30 text-xs text-white transition-all cursor-pointer shadow-md"
          >
            <Cpu className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-bold">Engine:</span>
            <span className="text-amber-400 font-semibold">
              {(AI_ENGINES.find(e => e.id === selectedEngine) ?? DEFAULT_ENGINE).name} ({byokMode === "developer" ? "Demo Key" : "BYOK Key"})
            </span>
          </button>
        </div>
      </header>

      {/* ── BYOK KEY & ENGINE SETTINGS DROPDOWN ── */}
      {showKeySettings && (
        <div className="absolute top-20 right-36 z-50 w-[420px] p-5 rounded-2xl bg-[#0d0d0d] border border-white/15 shadow-2xl space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h4 className="text-white font-bold text-xs flex items-center gap-2">
              <Cpu className="w-4 h-4 text-amber-400" /> AI Video Engine & BYOK Settings
            </h4>
            <button onClick={() => setShowKeySettings(false)} className="text-xs text-gray-400 hover:text-white">✕</button>
          </div>

          {/* AI Engine Selection */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Active AI Model Engine</label>
            <div className="grid grid-cols-2 gap-2">
              {AI_ENGINES.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setSelectedEngine(e.id)}
                  className={`p-2.5 rounded-xl text-left border transition-all ${selectedEngine === e.id
                      ? "bg-amber-400/10 border-amber-400 text-amber-400"
                      : "bg-white/5 border-white/5 text-gray-300 hover:bg-white/10"
                    }`}
                >
                  <p className="font-bold text-xs">{e.name}</p>
                  <p className="text-[9px] opacity-70 truncate">{e.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Key Mode Selection */}
          <div className="flex rounded-xl p-1 bg-black/60 border border-white/10 text-xs font-bold">
            <button
              onClick={() => setByokMode("developer")}
              className={`flex-1 py-1.5 rounded-lg transition-all ${byokMode === "developer" ? "bg-amber-400 text-black shadow-md" : "text-gray-400 hover:text-white"
                }`}
            >
              Developer Key (Demo)
            </button>
            <button
              onClick={() => setByokMode("custom")}
              className={`flex-1 py-1.5 rounded-lg transition-all ${byokMode === "custom" ? "bg-amber-400 text-black shadow-md" : "text-gray-400 hover:text-white"
                }`}
            >
              Custom Key (BYOK)
            </button>
          </div>

          {byokMode === "developer" ? (
            <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/20 text-xs text-amber-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Developer Master API Key Active (`sk-clipvault-demo-key`). Ready out of the box!</span>
            </div>
          ) : (
            <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1 scrollbar-hide">
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-gray-300 font-bold">🧠 Anthropic API Key (Claude Fable)</span>
                  <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" className="text-amber-400 hover:underline">Get Key ↗</a>
                </div>
                <input
                  type="password"
                  value={anthropicKey}
                  onChange={(e) => setAnthropicKey(e.target.value)}
                  placeholder="sk-ant-api03-..."
                  className="w-full rounded-xl px-3 py-1.5 text-xs text-white bg-white/5 border border-white/10 outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-gray-300 font-bold">🎥 Higgsfield AI Key</span>
                  <a href="https://higgsfield.ai" target="_blank" rel="noreferrer" className="text-amber-400 hover:underline">Get Key ↗</a>
                </div>
                <input
                  type="password"
                  value={higgsfieldKey}
                  onChange={(e) => setHiggsfieldKey(e.target.value)}
                  placeholder="hg-live-..."
                  className="w-full rounded-xl px-3 py-1.5 text-xs text-white bg-white/5 border border-white/10 outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-gray-300 font-bold">⚡ SeeDance AI Key (ByteDance)</span>
                  <a href="https://seedance.ai" target="_blank" rel="noreferrer" className="text-amber-400 hover:underline">Get Key ↗</a>
                </div>
                <input
                  type="password"
                  value={seeDanceKey}
                  onChange={(e) => setSeeDanceKey(e.target.value)}
                  placeholder="sd-prod-..."
                  className="w-full rounded-xl px-3 py-1.5 text-xs text-white bg-white/5 border border-white/10 outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-gray-300 font-bold">🤖 OpenAI Sora / GPT-4o Key</span>
                  <a href="https://platform.openai.com" target="_blank" rel="noreferrer" className="text-amber-400 hover:underline">Get Key ↗</a>
                </div>
                <input
                  type="password"
                  value={openAiKey}
                  onChange={(e) => setOpenAiKey(e.target.value)}
                  placeholder="sk-proj-..."
                  className="w-full rounded-xl px-3 py-1.5 text-xs text-white bg-white/5 border border-white/10 outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-gray-300 font-bold">🌐 Custom API Proxy URL (Optional)</span>
                </div>
                <input
                  type="text"
                  value={customBaseUrl}
                  onChange={(e) => setCustomBaseUrl(e.target.value)}
                  placeholder="e.g. https://api.chatanywhere.tech/v1"
                  className="w-full rounded-xl px-3 py-1.5 text-xs text-white bg-white/5 border border-white/10 outline-none focus:border-amber-400"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="relative z-10 flex-1 flex overflow-hidden">

        {/* LEFT COLUMN: Controls & Settings OR Crop Editor */}
        <div className="w-[520px] flex-shrink-0 border-r border-white/5 overflow-y-auto scrollbar-hide px-8 py-6 bg-[#070707] flex flex-col">
          
          {cropModalOpen !== "none" ? (
            <div className="w-full flex-1 flex flex-col space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-bold text-lg">Crop Editor</h3>
                  <p className="text-gray-400 text-xs mt-1">Adjust the glowing yellow box.</p>
                </div>
                <button onClick={() => setCropModalOpen("none")} className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-400 text-black hover:brightness-110 transition-all shadow-[0_0_15px_rgba(251,191,36,0.3)]">Done Cropping</button>
              </div>

              <div className="text-center text-xs text-gray-400 mb-2">
                Drag the <span className="text-amber-400 font-bold">Top Clip (Amber)</span> and <span className="text-cyan-400 font-bold">Bottom Clip (Cyan)</span> boxes.
              </div>

              {/* 480x270 Fixed Stage for Cropping Math */}
              <div className="relative w-[456px] h-[256px] bg-[#111] rounded-2xl overflow-hidden shadow-2xl border border-white/10 ring-2 ring-white/5 mx-auto mt-2 select-none">
                <video 
                  src={activeVideoUrl} 
                  autoPlay 
                  loop 
                  muted 
                  playsInline
                  className="w-full h-full object-cover" 
                />
                
                {/* TOP CROP BOX */}
                <Rnd
                  position={{ x: cropTop.x, y: cropTop.y }}
                  size={{ width: cropTop.width, height: cropTop.height }}
                  onDrag={(e, d) => setCropTop(prev => ({ ...prev, x: d.x, y: d.y }))}
                  onResize={(e, dir, ref, delta, position) => {
                    const newDim = { width: parseFloat(ref.style.width), height: parseFloat(ref.style.height), x: position.x, y: position.y };
                    setCropTop(newDim);
                  }}
                  bounds="parent"
                  className="group cursor-move z-20"
                >
                  <div className="absolute inset-0 border-2 border-amber-400 bg-amber-400/25 shadow-[0_0_20px_rgba(251,191,36,0.4)] flex flex-col justify-between p-1.5 backdrop-blur-[1px]">
                    <span className="text-[9px] font-black text-amber-300 bg-black/90 px-1.5 py-0.5 rounded w-max uppercase tracking-wider">
                      TOP CLIP (9:16)
                    </span>
                    <div className="w-full flex justify-between text-[8px] font-mono text-amber-300/80">
                      <span>{Math.round(cropTop.width)}px</span>
                      <span>{Math.round(cropTop.height)}px</span>
                    </div>
                  </div>
                </Rnd>

                {/* BOTTOM CROP BOX */}
                <Rnd
                  position={{ x: cropBottom.x, y: cropBottom.y }}
                  size={{ width: cropBottom.width, height: cropBottom.height }}
                  onDrag={(e, d) => setCropBottom(prev => ({ ...prev, x: d.x, y: d.y }))}
                  onResize={(e, dir, ref, delta, position) => {
                    const newDim = { width: parseFloat(ref.style.width), height: parseFloat(ref.style.height), x: position.x, y: position.y };
                    setCropBottom(newDim);
                  }}
                  bounds="parent"
                  className="group cursor-move z-10"
                >
                  <div className="absolute inset-0 border-2 border-cyan-400 bg-cyan-400/25 shadow-[0_0_20px_rgba(34,211,238,0.4)] flex flex-col justify-between p-1.5 backdrop-blur-[1px]">
                    <span className="text-[9px] font-black text-cyan-300 bg-black/90 px-1.5 py-0.5 rounded w-max uppercase tracking-wider">
                      BOTTOM CLIP (9:16)
                    </span>
                    <div className="w-full flex justify-between text-[8px] font-mono text-cyan-300/80">
                      <span>{Math.round(cropBottom.width)}px</span>
                      <span>{Math.round(cropBottom.height)}px</span>
                    </div>
                  </div>
                </Rnd>
              </div>
              
              {/* Start/End Time Trimming Controls */}
              <div className="w-[456px] mx-auto mt-4 bg-white/5 border border-white/10 rounded-xl p-3 shadow-inner">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-gray-300">Trim Custom Split Clip</span>
                  <span className="text-[10px] text-gray-500">Set start/end points using the video above</span>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      const vids = document.querySelectorAll('video');
                      const vid = Array.from(vids).find(v => v.src.includes(activeVideoUrl));
                      if (vid) {
                        const mins = Math.floor(vid.currentTime / 60).toString().padStart(2, '0');
                        const secs = Math.floor(vid.currentTime % 60).toString().padStart(2, '0');
                        setStartTs(`${mins}:${secs}`);
                      }
                    }}
                    className="flex-1 py-2 rounded-lg text-xs font-bold bg-white/10 text-white hover:bg-white/20 transition-all border border-white/10"
                  >
                    Set Start Time ({startTs || "00:00"})
                  </button>
                  <button 
                    onClick={() => {
                      const vids = document.querySelectorAll('video');
                      const vid = Array.from(vids).find(v => v.src.includes(activeVideoUrl));
                      if (vid) {
                        const mins = Math.floor(vid.currentTime / 60).toString().padStart(2, '0');
                        const secs = Math.floor(vid.currentTime % 60).toString().padStart(2, '0');
                        setEndTs(`${mins}:${secs}`);
                      }
                    }}
                    className="flex-1 py-2 rounded-lg text-xs font-bold bg-white/10 text-white hover:bg-white/20 transition-all border border-white/10"
                  >
                    Set End Time ({endTs || "00:00"})
                  </button>
                </div>
              </div>
              <div className="text-center text-xs text-gray-500 mt-4">Drag the edges to resize, or drag the center to move. Results show instantly on the right.</div>
            </div>
          ) : (
            <div className="space-y-7 w-full animate-fadeIn">

              {/* Media Source Section */}
              <Section title="Media Source" accent={G2}>
            <div className="flex items-center bg-white/5 rounded-xl p-1 mb-3 border border-white/10">
              <button
                onClick={() => setInputType("youtube")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${inputType === "youtube" ? "bg-amber-400 text-black shadow-md" : "text-gray-400 hover:text-white"}`}
              >
                YouTube Link
              </button>
              <button
                onClick={() => setInputType("local")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${inputType === "local" ? "bg-amber-400 text-black shadow-md" : "text-gray-400 hover:text-white"}`}
              >
                Local Upload
              </button>
            </div>

            {inputType === "youtube" ? (
              <>
                <p className="text-xs text-gray-400 mb-2.5">Paste a YouTube URL to automatically download and extract high-energy clips.</p>
                <div className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 bg-white/5 border border-amber-400/30">
                  <Link2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <input
                    value={ytUrl}
                    onChange={e => setYtUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="flex-1 bg-transparent text-xs text-white outline-none placeholder-gray-500"
                  />
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-gray-400 mb-2.5">Select a local video file from your computer to process.</p>
                  <button
                    onClick={async () => {
                      try {
                        const filePaths = await (window as any).electronAPI.showOpenDialog({
                          properties: ['openFile'],
                          filters: [{ name: 'Videos', extensions: ['mp4', 'mkv', 'mov', 'webm'] }]
                        });
                        if (filePaths && filePaths.length > 0) {
                          const filePath = filePaths[0];
                          const url = `http://127.0.0.1:8000/stream?path=${encodeURIComponent(filePath)}`;
                          setActiveVideoUrl(url);
                          setLocalFilePath(filePath);
                          setYtUrl(""); // Clear YT url
                        }
                      } catch (err) {
                        console.error("Failed to select file:", err);
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-xl px-3.5 py-4 bg-white/5 border border-dashed border-amber-400/30 cursor-pointer hover:bg-white/10 transition-colors"
                  >
                  {localFilePath ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      <span className="text-xs font-bold text-green-400 truncate max-w-[200px]" title={localFilePath}>
                        {localFilePath.split('\\').pop()?.split('/').pop() || "Video Selected"}
                      </span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-white">Choose Video File...</span>
                    </>
                  )}
                  </button>
              </>
            )}
          </Section>

          {/* Download Quality */}
          <Section title="Download Quality" accent={G2}>
            <div className="grid grid-cols-2 gap-3">
              {QUALITIES.map(q => (
                <button
                  key={q.id}
                  onClick={() => setQuality(q.id)}
                  className={`p-3 rounded-xl text-left border transition-all ${quality === q.id
                      ? "bg-amber-400/10 border-amber-400/50 shadow-[0_0_15px_rgba(251,191,36,0.15)]"
                      : "bg-white/[0.02] border-white/5 hover:border-white/10"
                    }`}
                >
                  <p className="text-white text-xs font-bold">{q.label}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{q.desc}</p>
                </button>
              ))}
            </div>
          </Section>

          {/* Video Layout Options */}
          <Section title="Video Layout" accent={G2}>
            <div className="space-y-2">
              {LAYOUTS.map((l, i) => (
                <div key={l.id} className="flex flex-col gap-1">
                  <button
                    onClick={() => setLayout(l.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left border transition-all ${layout === l.id
                        ? "bg-amber-400/10 border-amber-400/50 shadow-[0_0_12px_rgba(251,191,36,0.15)]"
                        : "bg-white/[0.02] border-white/5 hover:border-white/10"
                      }`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${layout === l.id ? "bg-amber-400 text-black" : "bg-white/10 text-gray-400"
                      }`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{l.label}</p>
                      <p className="text-[10px] text-gray-500 truncate">{l.desc}</p>
                    </div>
                    {layout === l.id && <Check className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                  </button>
                  {layout === l.id && l.id === "custom_split" && (
                    <button 
                      onClick={() => setCropModalOpen("top")}
                      className="w-full py-2 bg-amber-400/20 text-amber-400 border border-amber-400/30 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-amber-400 hover:text-black transition-all flex items-center justify-center gap-2"
                    >
                      <Move className="w-3.5 h-3.5" /> Adjust Crop Positions
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Section>

          {/* Camera Tracking Style */}
          <div className={layout === "custom_split" ? "opacity-30 pointer-events-none transition-opacity" : "transition-opacity"}>
            <Section title="Camera Tracking Style" accent={G2}>
              <div className="grid grid-cols-2 gap-3">
                <button
                onClick={() => setCameraStyle("smooth")}
                className={`p-3 rounded-xl text-left border transition-all ${cameraStyle === "smooth"
                    ? "bg-amber-400/10 border-amber-400/50 shadow-[0_0_15px_rgba(251,191,36,0.15)]"
                    : "bg-white/[0.02] border-white/5 hover:border-white/10"
                  }`}
              >
                <p className="text-white text-xs font-bold">Smooth / Glide</p>
                <p className="text-[10px] text-gray-500 mt-0.5">Slow cinematic pans</p>
              </button>
              <button
                onClick={() => setCameraStyle("snappy")}
                className={`p-3 rounded-xl text-left border transition-all ${cameraStyle === "snappy"
                    ? "bg-amber-400/10 border-amber-400/50 shadow-[0_0_15px_rgba(251,191,36,0.15)]"
                    : "bg-white/[0.02] border-white/5 hover:border-white/10"
                  }`}
              >
                <p className="text-white text-xs font-bold">Snappy / Action</p>
                <p className="text-[10px] text-gray-500 mt-0.5">Fast accurate tracking</p>
              </button>
            </div>
          </Section>
          </div>

          {/* Duration Mode */}
          <Section title="Clip Duration & AI Settings" accent={G2}>
            <div className="space-y-2 mb-3">
              {DURATION_MODES.map((d, i) => (
                <button
                  key={d.id}
                  onClick={() => setDurationMode(d.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left border transition-all ${durationMode === d.id
                      ? "bg-amber-400/10 border-amber-400/50"
                      : "bg-white/[0.02] border-white/5"
                    }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${durationMode === d.id ? "bg-amber-400 text-black" : "bg-white/10 text-gray-400"
                    }`}>
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-white">{d.label}</p>
                    <p className="text-[10px] text-gray-500">{d.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className={`space-y-3 transition-opacity duration-300 ${durationMode !== "auto" ? "opacity-30 pointer-events-none grayscale" : "opacity-100"}`}>
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5">
                <span className="text-xs text-white font-medium">Clips to generate</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setNumClips(n => Math.max(1, n - 1))} className="w-6 h-6 rounded bg-white/10 flex items-center justify-center text-white cursor-pointer hover:bg-white/20 transition-colors">
                    -
                  </button>
                  <span className="text-white font-bold text-xs">{numClips}</span>
                  <button onClick={() => setNumClips(n => Math.min(10, n + 1))} className="w-6 h-6 rounded bg-white/10 flex items-center justify-center text-white cursor-pointer hover:bg-white/20 transition-colors">
                    +
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5">
                <span className="text-xs text-white font-medium">Clip Length (Seconds)</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={targetDuration}
                    onChange={(e) => {
                      if (e.target.value === "") {
                        setTargetDuration("");
                      } else {
                        setTargetDuration(Math.max(1, parseInt(e.target.value) || 1));
                      }
                    }}
                    onBlur={() => {
                      if (targetDuration === "") setTargetDuration(30);
                    }}
                    className="w-16 rounded bg-black/40 border border-white/10 px-2 py-1 text-white text-xs font-bold text-center outline-none focus:border-amber-400"
                  />
                  <span className="text-gray-400 text-xs">sec</span>
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Include specific moments (Topic)</label>
                <input
                  type="text"
                  value={topicPrompt}
                  onChange={(e) => setTopicPrompt(e.target.value)}
                  placeholder="e.g. Find moments when they talked about the playoffs"
                  className="w-full rounded-lg px-3 py-2 text-xs text-white bg-white/5 border border-white/10 outline-none focus:border-amber-400 placeholder-gray-600 transition-colors"
                />
              </div>

              {/* Output Directory & Batch Folder Settings */}
              <div className="space-y-2 mt-3 p-3 rounded-xl bg-white/[0.03] border border-white/10">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Folder className="w-3.5 h-3.5" /> Output Destination Folder
                  </label>
                  {customOutputDir && (
                    <button
                      type="button"
                      onClick={() => setCustomOutputDir("")}
                      className="text-[9px] text-gray-400 hover:text-white underline cursor-pointer"
                    >
                      Reset to Default
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <div className="flex-1 min-w-0 bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 flex items-center gap-2">
                    <HardDrive className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                    <span className="text-[11px] text-gray-300 font-mono truncate" title={customOutputDir || "engine/clips"}>
                      {customOutputDir ? customOutputDir : "Default (engine/clips)"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={chooseCustomDirectory}
                    className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold border border-white/10 flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                  >
                    <FolderOpen className="w-3 h-3 text-amber-400" /> Browse
                  </button>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Save into Subfolder / Batch</label>
                    {customFolderName && (
                      <button
                        type="button"
                        onClick={() => setCustomFolderName("")}
                        className="text-[9px] text-amber-400/80 hover:text-amber-300 underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={customFolderName}
                    onChange={(e) => setCustomFolderName(e.target.value)}
                    placeholder="e.g. AMP Chameleon, Podcasts (Creates new folder)"
                    className="w-full rounded-lg px-3 py-1.5 text-xs text-white bg-black/30 border border-white/10 outline-none focus:border-amber-400 placeholder-gray-600 transition-colors"
                  />
                  {vaultFolders.length > 1 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[9px] text-gray-500 font-bold uppercase">Quick Pick:</span>
                      {vaultFolders.map(folder => (
                        <button
                          key={folder}
                          type="button"
                          onClick={() => setCustomFolderName(folder === "Main Library" ? "" : folder)}
                          className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-all border ${
                            (customFolderName === folder || (!customFolderName && folder === "Main Library"))
                              ? "bg-amber-400/20 text-amber-400 border-amber-400/40"
                              : "bg-white/5 text-gray-400 border-white/5 hover:border-white/20 hover:text-white"
                          }`}
                        >
                          📁 {folder}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1 mt-3">
                <label className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Export File Name Prefix (Optional)</label>
                <input
                  type="text"
                  value={exportFileName}
                  onChange={(e) => setExportFileName(e.target.value)}
                  placeholder="e.g. MyViralClip"
                  className="w-full rounded-lg px-3 py-2 text-xs text-white bg-white/5 border border-white/10 outline-none focus:border-amber-400 placeholder-gray-600 transition-colors"
                />
              </div>
              
              <div className="space-y-1 mt-3 mb-2">
                <label className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Video Language</label>
                <select
                  value={transcriptionLanguage}
                  onChange={(e) => setTranscriptionLanguage(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-xs text-white bg-white/5 border border-white/10 outline-none focus:border-amber-400 cursor-pointer appearance-none"
                >
                  <option className="bg-[#111] text-white" value="auto">Auto-Detect Language</option>
                  <option className="bg-[#111] text-white" value="en">English</option>
                  <option className="bg-[#111] text-white" value="tl">Tagalog / Filipino</option>
                  <option className="bg-[#111] text-white" value="es">Spanish</option>
                  <option className="bg-[#111] text-white" value="fr">French</option>
                  <option className="bg-[#111] text-white" value="de">German</option>
                  <option className="bg-[#111] text-white" value="it">Italian</option>
                  <option className="bg-[#111] text-white" value="pt">Portuguese</option>
                  <option className="bg-[#111] text-white" value="ja">Japanese</option>
                  <option className="bg-[#111] text-white" value="ko">Korean</option>
                  <option className="bg-[#111] text-white" value="zh">Chinese</option>
                  <option className="bg-[#111] text-white" value="ru">Russian</option>
                  <option className="bg-[#111] text-white" value="id">Indonesian</option>
                  <option className="bg-[#111] text-white" value="hi">Hindi</option>
                  <option className="bg-[#111] text-white" value="ar">Arabic</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              {/* B-Roll & SFX Toggles */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors" onClick={() => setAutoBroll(!autoBroll)}>
                <div className="flex flex-col">
                  <span className="text-xs text-white font-medium flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-amber-400"/> Auto B-Roll</span>
                  <span className="text-[10px] text-gray-500">Overlay relevant stock footage automatically</span>
                </div>
                <div className={`w-8 h-4 rounded-full flex items-center p-0.5 transition-colors ${autoBroll ? "bg-amber-400" : "bg-white/20"}`}>
                  <div className={`w-3 h-3 bg-white rounded-full shadow-md transform transition-transform ${autoBroll ? "translate-x-4" : "translate-x-0"}`} />
                </div>
              </div>

              <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-white/5 border border-white/5 transition-colors">
                <div className="flex items-center justify-between cursor-pointer hover:bg-white/10 p-1 rounded-lg" onClick={() => setAddBgMusic(!addBgMusic)}>
                  <div>
                    <span className="text-xs text-white font-medium flex items-center gap-1.5"><Music className="w-3.5 h-3.5 text-amber-400"/> Background Music</span>
                    <span className="text-[10px] text-gray-500">Add trendy background music</span>
                  </div>
                  <div className={`w-8 h-4 rounded-full flex items-center p-0.5 transition-colors ${addBgMusic ? "bg-amber-400" : "bg-white/20"}`}>
                    <div className={`w-3 h-3 bg-white rounded-full shadow-md transform transition-transform ${addBgMusic ? "translate-x-4" : "translate-x-0"}`} />
                  </div>
                </div>
                
                {addBgMusic && (
                  <div className="mt-2 pl-5 pr-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] text-gray-400">Volume</span>
                      <span className="text-[10px] text-amber-400 font-bold">{Math.round(bgMusicVol * 100)}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.01" 
                      max="1.0" 
                      step="0.01" 
                      value={bgMusicVol} 
                      onChange={(e) => setBgMusicVol(parseFloat(e.target.value))}
                      className="w-full accent-amber-400"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors" onClick={() => setAutoSfx(!autoSfx)}>
                <div>
                  <span className="text-xs text-white font-medium flex items-center gap-1.5"><Volume2 className="w-3.5 h-3.5 text-amber-400"/> Auto Emojis & SFX</span>
                  <span className="text-[10px] text-gray-500">Pop sound effects and animated emojis</span>
                </div>
                <div className={`w-8 h-4 rounded-full flex items-center p-0.5 transition-colors ${autoSfx ? "bg-amber-400" : "bg-white/20"}`}>
                  <div className={`w-3 h-3 bg-white rounded-full shadow-md transform transition-transform ${autoSfx ? "translate-x-4" : "translate-x-0"}`} />
                </div>
              </div>

              <div className="flex flex-col gap-3 p-3.5 rounded-xl bg-white/5 border border-white/5 transition-colors">
                <div className="flex items-center justify-between cursor-pointer hover:bg-white/10 p-1 rounded-lg" onClick={() => setAddCaptions(!addCaptions)}>
                  <div>
                    <span className="text-xs text-white font-medium flex items-center gap-1.5"><Type className="w-3.5 h-3.5 text-amber-400"/> AI Captions</span>
                    <span className="text-[10px] text-gray-500">Generate animated word-by-word subtitles</span>
                  </div>
                  <div className={`w-8 h-4 rounded-full flex items-center p-0.5 transition-colors ${addCaptions ? "bg-amber-400" : "bg-white/20"}`}>
                    <div className={`w-3 h-3 bg-white rounded-full shadow-md transform transition-transform ${addCaptions ? "translate-x-4" : "translate-x-0"}`} />
                  </div>
                </div>

                {addCaptions && (
                  <div className="space-y-3 pt-2 border-t border-white/5 animate-fadeIn">
                    {/* Live Drag & Drop Guidance */}
                    <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-start gap-2.5">
                      <Move className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-[11px] text-gray-300 leading-tight">
                        <strong className="text-amber-400 block mb-0.5">Real-Time Drag & Drop:</strong>
                        Click and freely drag the subtitle badge up & down inside the mobile video preview on the right!
                      </div>
                    </div>

                    {/* Caption Position Controls */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Vertical Height</label>
                        <span className="text-[10px] font-mono text-gray-300 font-bold bg-white/10 px-1.5 py-0.5 rounded">{captionYPct}% from top</span>
                      </div>

                      {/* Smooth Slider */}
                      <input 
                        type="range" 
                        min="10" 
                        max="90" 
                        step="1" 
                        value={captionYPct} 
                        onChange={(e) => setCaptionYPct(parseInt(e.target.value))}
                        className="w-full accent-amber-400 cursor-pointer h-1.5 bg-black/40 rounded-lg"
                      />
                    </div>

                    {/* Caption Style Preset Selection */}
                    <div className="space-y-1.5 pt-1">
                      <label className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Subtitle Style</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: "capcut_yellow", name: "⚡ Yellow Pop", bg: "bg-yellow-400/20 text-yellow-300 border-yellow-400/40" },
                          { id: "clean_white", name: "✨ Clean White", bg: "bg-white/10 text-white border-white/20" },
                          { id: "neon_cyan", name: "💎 Neon Cyan", bg: "bg-cyan-400/20 text-cyan-300 border-cyan-400/40" },
                          { id: "emerald_green", name: "🌿 Emerald", bg: "bg-emerald-400/20 text-emerald-300 border-emerald-400/40" },
                          { id: "fire_red", name: "🔥 Fire Red", bg: "bg-red-400/20 text-red-300 border-red-400/40" },
                          { id: "sigma_pink", name: "🌸 Sigma Pink", bg: "bg-pink-400/20 text-pink-300 border-pink-400/40" }
                        ].map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setSelectedEffectId(s.id)}
                            className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border truncate transition-all ${
                              selectedEffectId === s.id
                                ? "bg-amber-400 text-black border-amber-400 shadow-md font-extrabold"
                                : `${s.bg} hover:brightness-125`
                            }`}
                          >
                            {s.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>


              
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors" onClick={() => setAvoidCopyright(!avoidCopyright)}>
                <div className="flex flex-col">
                  <span className="text-xs text-white font-medium flex items-center gap-1.5"><Copyright className="w-3.5 h-3.5 text-amber-400"/> Bypass Copyright</span>
                  <span className="text-[10px] text-gray-500">Flips video & adjusts speed/color</span>
                </div>
                <div className={`w-8 h-4 rounded-full flex items-center p-0.5 transition-colors ${avoidCopyright ? "bg-amber-400" : "bg-white/20"}`}>
                  <div className={`w-3 h-3 bg-white rounded-full shadow-md transform transition-transform ${avoidCopyright ? "translate-x-4" : "translate-x-0"}`} />
                </div>
              </div>
            </div>

            <div className={`grid grid-cols-2 gap-3 p-3.5 rounded-xl transition-opacity duration-300 ${durationMode !== "custom" ? "opacity-30 pointer-events-none bg-white/5 border border-white/5 grayscale" : "bg-white/5 border border-amber-400/30 opacity-100"}`}>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Start Timestamp</label>
                <input
                  type="text"
                  value={startTs}
                  onChange={(e) => setStartTs(e.target.value)}
                  placeholder="e.g. 0:15"
                  className="w-full rounded-lg px-3 py-2 text-xs font-bold text-white bg-black/20 border border-white/10 outline-none focus:border-amber-400 transition-colors"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">End Timestamp</label>
                <input
                  type="text"
                  value={endTs}
                  onChange={(e) => setEndTs(e.target.value)}
                  placeholder="e.g. 1:45"
                  className="w-full rounded-lg px-3 py-2 text-xs font-bold text-white bg-black/20 border border-white/10 outline-none focus:border-amber-400 transition-colors"
                />
              </div>
            </div>
          </Section>

          {/* Run Button Panel */}
          <div className="pt-4 border-t border-white/10 space-y-3">
            {running && (
              <div className="p-4 rounded-2xl bg-amber-400/10 border border-amber-400/20 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-400">{statusText}</span>
                  <span className="font-mono text-gray-300">{Math.floor(progress)}%</span>
                </div>
                <div className="h-2 rounded-full bg-black/40 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            <button
              onClick={runClipper}
              disabled={running}
              className="w-full py-4 rounded-2xl font-bold text-sm bg-gradient-to-r from-amber-400 to-amber-500 text-black hover:opacity-95 transition-all shadow-[0_0_25px_rgba(251,191,36,0.3)] flex items-center justify-center gap-2 cursor-pointer"
            >
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-black" />}
              {running ? "Processing AI Clipper..." : done ? "Re-Run AI Clipper" : "Run AI Clipper"}
            </button>

            {errorMsg && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold whitespace-pre-wrap">
                {errorMsg}
              </div>
            )}

            {!running && generatedClips.length > 0 && (
              <button
                onClick={() => setViewMode("gallery")}
                className="w-full py-4 rounded-2xl font-bold text-sm bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                View Generated Clips ({generatedClips.length})
              </button>
            )}
          </div>
            </div>
          )}
        </div>
        {/* RIGHT COLUMN: OPUS UI (Gallery / Details / Live Preview) */}
        {viewMode === "setup" && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-black/90 relative overflow-hidden">
            {/* Background Ambient Spotlight */}
            <div className="absolute w-[450px] h-[450px] bg-amber-400/10 rounded-full filter blur-[120px] pointer-events-none" />

            {/* SMARTPHONE DEVICE CONTAINER */}
            <div className="relative h-[90%] max-h-[720px] aspect-[9/16] rounded-[48px] p-4 bg-[#111] border-[6px] border-white/20 shadow-[0_25px_80px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden z-10 mx-auto shrink-0 min-w-[280px]">
              {/* Smartphone Notch & Speaker */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-50 flex items-center justify-center gap-2 border border-white/10 shadow-md">
                <div className="w-3 h-3 rounded-full bg-[#1a1a1a] border border-white/10" />
                <div className="w-8 h-1 rounded-full bg-white/20" />
              </div>

              {/* Smartphone Screen Viewport */}
              <div 
                ref={phoneContainerRef} 
                onClick={togglePlay}
                className="relative flex-1 w-full h-full rounded-[36px] overflow-hidden bg-black flex items-center justify-center cursor-pointer"
              >
                {!running ? (
                  layout === "custom_split" ? (
                    <div className="w-full h-full flex flex-col relative bg-black select-none">
                      <div className="flex-1 relative overflow-hidden border-b-2 border-white/20">
                        {renderCroppedVideo(activeVideoUrl, cropTop)}
                      </div>
                      <div className="flex-1 relative overflow-hidden">
                        {renderCroppedVideo(splitType === "guest" ? DEMO_VIDEOS[(activeClipIndex + 2) % DEMO_VIDEOS.length] : activeVideoUrl, cropBottom)}
                      </div>

                      {/* Video Player Floating Overlay (Mute Button) */}
                      {activeVideoUrl && (
                        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                            className="p-1.5 rounded-full bg-black/70 backdrop-blur-md text-white border border-white/20 hover:bg-black transition-colors cursor-pointer shadow-lg"
                          >
                            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-amber-400" />}
                          </button>
                        </div>
                      )}

                      {/* Real-Time Live Freely Draggable Subtitle Box (100% Centered) */}
                      {addCaptions && (
                        <div 
                          className="absolute inset-x-0 flex justify-center pointer-events-none z-30 select-none px-4"
                          style={{ top: `${captionYPct}%`, transform: 'translateY(-50%)' }}
                        >
                          <div 
                            onMouseDown={startCaptionDrag}
                            className={`pointer-events-auto px-5 py-2.5 rounded-2xl backdrop-blur-xl border shadow-2xl flex flex-col items-center gap-1 cursor-grab active:cursor-grabbing transition-transform duration-75 select-none ${
                              isDraggingCaption 
                                ? "bg-amber-400/25 border-amber-400 scale-105 shadow-[0_0_30px_rgba(251,191,36,0.6)] ring-2 ring-amber-400/50" 
                                : "bg-black/80 border-white/25 hover:border-amber-400/60 hover:shadow-lg"
                            }`}
                          >
                            <span className="text-[8.5px] font-extrabold text-amber-400 uppercase tracking-widest flex items-center gap-1 pointer-events-none">
                              <Move className="w-2.5 h-2.5" /> Drag Anywhere ({captionYPct}%)
                            </span>
                            <span className={`text-base tracking-wider uppercase font-black text-center pointer-events-none ${
                              selectedEffectId === "capcut_yellow" ? "text-yellow-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]" :
                              selectedEffectId === "clean_white" ? "text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]" :
                              selectedEffectId === "neon_cyan" ? "text-cyan-300 drop-shadow-[0_0_12px_rgba(6,182,212,0.8)]" :
                              selectedEffectId === "emerald_green" ? "text-emerald-300 drop-shadow-[0_0_12px_rgba(16,185,129,0.8)]" :
                              selectedEffectId === "fire_red" ? "text-red-400 drop-shadow-[0_0_12px_rgba(239,68,68,0.8)]" :
                              selectedEffectId === "sigma_pink" ? "text-pink-400 drop-shadow-[0_0_12px_rgba(236,72,153,0.8)]" :
                              "text-yellow-300"
                            }`}>
                              VIRAL CAPTION 🚀
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-full relative flex items-center justify-center overflow-hidden bg-black select-none">
                      {/* Real-time Live Video Playback inside Phone Viewport */}
                      {activeVideoUrl ? (
                        layout === "landscape_blur" ? (
                          <>
                            <video 
                              src={activeVideoUrl} 
                              autoPlay 
                              loop 
                              muted 
                              playsInline
                              className="absolute inset-0 w-full h-full object-cover filter blur-xl scale-125 opacity-40 pointer-events-none" 
                            />
                            <video 
                              ref={videoRef}
                              src={activeVideoUrl} 
                              autoPlay 
                              loop 
                              muted={isMuted} 
                              playsInline
                              className="relative w-full z-10 shadow-2xl object-contain pointer-events-none" 
                            />
                          </>
                        ) : layout === "landscape_fit" ? (
                          <video 
                            ref={videoRef}
                            src={activeVideoUrl} 
                            autoPlay 
                            loop 
                            muted={isMuted} 
                            playsInline
                            className="w-full max-h-full object-contain pointer-events-none" 
                          />
                        ) : (
                          <video 
                            ref={videoRef}
                            src={activeVideoUrl} 
                            autoPlay 
                            loop 
                            muted={isMuted} 
                            playsInline
                            className="w-full h-full object-cover pointer-events-none" 
                          />
                        )
                      ) : (
                        <div className="flex flex-col items-center justify-center p-6 text-center text-gray-500">
                          <Upload className="w-8 h-8 text-amber-400/60 mb-2" />
                          <p className="text-xs font-bold text-white">No Video Loaded</p>
                          <p className="text-[10px] text-gray-400 mt-1">Upload a video or enter a YouTube URL to preview</p>
                        </div>
                      )}

                      {/* Video Player Floating Overlay (Mute Button) */}
                      {activeVideoUrl && (
                        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                            className="p-1.5 rounded-full bg-black/70 backdrop-blur-md text-white border border-white/20 hover:bg-black transition-colors cursor-pointer shadow-lg"
                          >
                            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-amber-400" />}
                          </button>
                        </div>
                      )}

                      {/* Real-Time Live Freely Draggable Subtitle Box (100% Centered) */}
                      {addCaptions && (
                        <div 
                          className="absolute inset-x-0 flex justify-center pointer-events-none z-30 select-none px-4"
                          style={{ top: `${captionYPct}%`, transform: 'translateY(-50%)' }}
                        >
                          <div 
                            onMouseDown={startCaptionDrag}
                            className={`pointer-events-auto px-5 py-2.5 rounded-2xl backdrop-blur-xl border shadow-2xl flex flex-col items-center gap-1 cursor-grab active:cursor-grabbing transition-transform duration-75 select-none ${
                              isDraggingCaption 
                                ? "bg-amber-400/25 border-amber-400 scale-105 shadow-[0_0_30px_rgba(251,191,36,0.6)] ring-2 ring-amber-400/50" 
                                : "bg-black/80 border-white/25 hover:border-amber-400/60 hover:shadow-lg"
                            }`}
                          >
                            <span className="text-[8.5px] font-extrabold text-amber-400 uppercase tracking-widest flex items-center gap-1 pointer-events-none">
                              <Move className="w-2.5 h-2.5" /> Drag Anywhere ({captionYPct}%)
                            </span>
                            <span className={`text-base tracking-wider uppercase font-black text-center pointer-events-none ${
                              selectedEffectId === "capcut_yellow" ? "text-yellow-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]" :
                              selectedEffectId === "clean_white" ? "text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]" :
                              selectedEffectId === "neon_cyan" ? "text-cyan-300 drop-shadow-[0_0_12px_rgba(6,182,212,0.8)]" :
                              selectedEffectId === "emerald_green" ? "text-emerald-300 drop-shadow-[0_0_12px_rgba(16,185,129,0.8)]" :
                              selectedEffectId === "fire_red" ? "text-red-400 drop-shadow-[0_0_12px_rgba(239,68,68,0.8)]" :
                              selectedEffectId === "sigma_pink" ? "text-pink-400 drop-shadow-[0_0_12px_rgba(236,72,153,0.8)]" :
                              "text-yellow-300"
                            }`}>
                              VIRAL CAPTION 🚀
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
                    <span className="text-amber-400 font-bold text-sm">{Math.floor(progress)}%</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {viewMode === "gallery" && (
          <div className="flex-1 bg-[#0a0a0a] overflow-y-auto p-8 animate-fadeIn relative">
             {/* Header Toolbar */}
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-white/10">
               <div>
                 <h2 className="text-2xl font-black text-white flex items-center gap-3">
                   <Sparkles className="text-amber-400 w-6 h-6" /> Generated Viral Clips
                   <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-400 border border-amber-400/30 font-bold">
                     {generatedClips.length} Clips
                   </span>
                 </h2>
                 <p className="text-xs text-gray-400 mt-1">
                   All generated videos are <span className="text-green-400 font-bold">immediately saved</span> on your disk and ready to upload.
                 </p>
               </div>

               <div className="flex items-center gap-3 flex-wrap">
                 <button 
                   onClick={() => openOutputFolder()}
                   className="px-4 py-2.5 rounded-xl bg-amber-400 text-black font-extrabold text-xs hover:bg-amber-300 transition-all shadow-[0_0_20px_rgba(251,191,36,0.3)] flex items-center gap-2 cursor-pointer"
                 >
                   <FolderOpen className="w-4 h-4 text-black" /> Open Output Folder
                 </button>

                 <button 
                   onClick={async () => {
                     if ((window as any).electronAPI?.selectDirectory) {
                       const dest = await (window as any).electronAPI.selectDirectory();
                       if (dest) {
                         setExportNotice(`Export folder selected: ${dest}`);
                         setTimeout(() => setExportNotice(""), 5000);
                         if ((window as any).electronAPI?.openPath) {
                           await (window as any).electronAPI.openPath(dest);
                         }
                       }
                     }
                   }}
                   className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/10 transition-all flex items-center gap-2 cursor-pointer"
                 >
                   <FolderPlus className="w-4 h-4 text-amber-400" /> Export / Copy To...
                 </button>

                 <button 
                   onClick={() => setViewMode("setup")} 
                   className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-bold text-xs border border-white/10 transition-all flex items-center gap-2 cursor-pointer"
                 >
                   <ArrowLeft className="w-3.5 h-3.5"/> Back to Editor
                 </button>
               </div>
             </div>

             {/* Selective Folder Sorting & Random Folder Router Panel */}
             <div className="mb-6 p-5 rounded-2xl bg-[#141414] border border-amber-400/30 shadow-2xl flex flex-col gap-4">
               <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-white/10">
                 <div className="flex items-center gap-2.5">
                   <FolderPlus className="w-5 h-5 text-amber-400" />
                   <div>
                     <h3 className="text-sm font-black text-white flex items-center gap-2">
                       Organize Generated Clips into Folders
                       <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-400 font-bold">
                         {gallerySelectedClips.length} of {generatedClips.length} Checked
                       </span>
                     </h3>
                     <p className="text-[11px] text-gray-400">
                       Check the videos you want in your chosen primary folder. <span className="text-amber-400 font-bold">All unselected videos</span> automatically go to your random/unsorted folder.
                     </p>
                   </div>
                 </div>

                 {/* Quick Select All / None */}
                 <div className="flex items-center gap-2">
                   <button
                     type="button"
                     onClick={() => setGallerySelectedClips(generatedClips.map((_, i) => i))}
                     className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition-all cursor-pointer"
                   >
                     Select All
                   </button>
                   <button
                     type="button"
                     onClick={() => setGallerySelectedClips([])}
                     className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-[11px] font-bold transition-all cursor-pointer"
                   >
                     Deselect All
                   </button>
                 </div>
               </div>

               {/* Target Folder Config Row */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                 {/* Primary Destination Folder */}
                 <div className="space-y-1">
                   <label className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                     1. Primary Folder (For Checked Clips)
                   </label>
                   <div className="flex items-center bg-black/50 border border-amber-400/40 rounded-xl px-3 py-2">
                     <FolderOpen className="w-4 h-4 text-amber-400 mr-2 shrink-0" />
                     <input
                       type="text"
                       value={galleryTargetFolder || customFolderName}
                       onChange={(e) => setGalleryTargetFolder(e.target.value)}
                       placeholder="e.g. AMP Chameleon, Highlights"
                       className="w-full bg-transparent text-xs text-white outline-none placeholder-gray-600 font-bold"
                     />
                   </div>
                 </div>

                 {/* Fallback Destination for Unchecked Clips */}
                 <div className="space-y-1">
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                     2. Fallback Folder (For Unchecked Clips)
                   </label>
                   <div className="flex items-center bg-black/50 border border-white/15 rounded-xl px-3 py-2">
                     <Folder className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
                     <input
                       type="text"
                       value={galleryRandomFolder}
                       onChange={(e) => setGalleryRandomFolder(e.target.value)}
                       placeholder="e.g. Random & Unsorted Clips"
                       className="w-full bg-transparent text-xs text-white outline-none placeholder-gray-600"
                     />
                   </div>
                 </div>

                 {/* Apply Sort Button */}
                 <div className="pt-4 md:pt-0 flex justify-end">
                   <button
                     type="button"
                     onClick={handleSortGeneratedClips}
                     disabled={isSortingGallery || generatedClips.length === 0}
                     className="w-full py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs transition-all shadow-[0_0_20px_rgba(251,191,36,0.3)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                   >
                     {isSortingGallery ? (
                       <Loader2 className="w-4 h-4 animate-spin text-black" />
                     ) : (
                       <CheckCircle2 className="w-4 h-4 text-black" />
                     )}
                     <span>Apply & Route Clips to Folders ⚡</span>
                   </button>
                 </div>
               </div>
             </div>

             {/* Storage Status & Path Bar */}
             <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-400/10 via-amber-400/5 to-transparent border border-amber-400/20 flex items-center justify-between gap-4 flex-wrap">
               <div className="flex items-center gap-3 min-w-0">
                 <div className="w-9 h-9 rounded-xl bg-amber-400/20 flex items-center justify-center shrink-0 border border-amber-400/30">
                   <FolderCheck className="w-5 h-5 text-amber-400" />
                 </div>
                 <div className="min-w-0">
                   <div className="flex items-center gap-2">
                     <span className="text-xs font-bold text-white">Permanently Stored In:</span>
                     <span className="text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded font-bold">Auto-Saved</span>
                   </div>
                   <p className="text-[11px] text-gray-400 font-mono truncate max-w-xl" title={lastOutputFolder || "Default engine/clips"}>
                     {lastOutputFolder || "C:\\...\\Desktop AI Clipping Software\\engine\\clips"}
                   </p>
                 </div>
               </div>

               <div className="flex items-center gap-2">
                 <button
                   onClick={() => openOutputFolder()}
                   className="text-xs text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer flex items-center gap-1"
                 >
                   Reveal in File Explorer <ExternalLink className="w-3 h-3" />
                 </button>
               </div>
             </div>

             {exportNotice && (
               <div className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold animate-fadeIn flex items-center gap-2">
                 <CheckCircle2 className="w-4 h-4" /> {exportNotice}
               </div>
             )}
             
             <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {generatedClips.map((clip, i) => {
                  const isSelected = gallerySelectedClips.includes(i);
                  return (
                    <div 
                      key={i} 
                      className={`bg-[#141414] rounded-2xl border transition-all cursor-pointer group flex flex-col relative overflow-hidden ${
                        isSelected ? "border-amber-400 ring-1 ring-amber-400/40" : "border-white/5 hover:border-amber-400/50"
                      }`}
                      onClick={() => { setActiveClipIndex(i); setViewMode("details"); }}
                    >
                      <div className="relative w-full aspect-[9/16] bg-black overflow-hidden shadow-inner">
                          <video src={clip.url || clip} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          
                          {/* Checkbox for selective folder sorting */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setGallerySelectedClips(prev => 
                                prev.includes(i) ? prev.filter(idx => idx !== i) : [...prev, i]
                              );
                            }}
                            className="absolute top-2 left-2 z-20 p-1.5 rounded-lg bg-black/80 hover:bg-black text-white border border-white/20 transition-all cursor-pointer shadow-lg"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-amber-400" />
                            ) : (
                              <Square className="w-4 h-4 text-gray-400 hover:text-white" />
                            )}
                          </button>

                          <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-bold text-white border border-white/10">9:16</div>
                          <div className="absolute bottom-2 left-2 bg-amber-400/90 text-black px-2 py-0.5 rounded-md text-[10px] font-extrabold shadow-lg flex items-center gap-1">
                            <Zap className="w-3 h-3 fill-black"/> Score: {clip.virality_score || 99}
                          </div>
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity transform scale-75 group-hover:scale-100">
                               <Play className="w-5 h-5 fill-white text-white ml-1" />
                            </div>
                          </div>
                      </div>
                      <div className="p-4 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-1.5 mb-2">
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold truncate max-w-[150px] ${
                                isSelected 
                                  ? "bg-amber-400/20 text-amber-400 border border-amber-400/30"
                                  : "bg-white/10 text-gray-400"
                              }`}>
                                {isSelected 
                                  ? `📁 ${galleryTargetFolder || customFolderName || "Primary Folder"}` 
                                  : `📁 ${galleryRandomFolder || "Random Folder"}`}
                              </span>
                            </div>
                            <h3 className="font-bold text-sm text-white line-clamp-2 leading-tight">{clip.content_title || clip.title || `Viral Clip #${i+1}`}</h3>
                            <p className="text-[10px] text-gray-500 mt-1.5 line-clamp-2">{clip.reason || clip.content_description}</p>
                          </div>
                          <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                              <span className="text-[10px] text-gray-400">{clip.duration ? `${clip.duration.toFixed(1)}s` : "30s"}</span>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setGeneratedClips(prev => prev.filter((_, idx) => idx !== i)); if (generatedClips.length <= 1) setViewMode("setup"); }} 
                                className="text-red-400/70 hover:text-red-400 text-xs font-bold transition-colors bg-red-400/10 hover:bg-red-400/20 px-2 py-1 rounded cursor-pointer"
                              >
                                Delete
                              </button>
                          </div>
                      </div>
                    </div>
                  );
                })}
             </div>
          </div>
        )}

        {viewMode === "details" && generatedClips[activeClipIndex] && (
          <div className="flex-1 bg-[#0a0a0a] flex flex-col relative animate-fadeIn">
            <button onClick={() => setViewMode("gallery")} className="absolute top-6 left-6 z-50 text-gray-400 hover:text-white text-xs flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-lg border border-white/10 backdrop-blur-md">
              <ArrowLeft className="w-4 h-4"/> Back to Gallery
            </button>

            <div className="flex-1 flex max-w-6xl mx-auto w-full pt-16 pb-8 gap-8 px-8">
               {/* Left: Video Player */}
               <div className="h-full max-h-[75vh] flex-shrink-0 flex items-center justify-center">
                  <div className="relative h-full aspect-[9/16] rounded-3xl overflow-hidden bg-black shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/10 group">
                    <video 
                      src={generatedClips[activeClipIndex].url || generatedClips[activeClipIndex]} 
                      autoPlay loop controls
                      className="w-full h-full object-contain bg-black"
                    />
                    <button 
                      onClick={(e) => {
                        const vid = e.currentTarget.previousElementSibling as HTMLVideoElement;
                        if (vid.requestFullscreen) vid.requestFullscreen();
                        else if ((vid as any).webkitRequestFullscreen) (vid as any).webkitRequestFullscreen();
                      }}
                      className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 p-2.5 rounded-xl text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all shadow-lg border border-white/10 flex items-center justify-center gap-2 text-xs font-bold"
                    >
                      <Maximize className="w-4 h-4" />
                      Fullscreen
                    </button>
                  </div>
               </div>

               {/* Right: Transcript & Details */}
               <div className="flex-1 flex flex-col pt-8">
                  <div className="flex items-center justify-between mb-4">
                      <span className="text-amber-400 text-xs font-bold bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20 flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 fill-amber-400" /> Virality Score: {generatedClips[activeClipIndex].virality_score || 95}
                      </span>
                      <div className="flex items-center gap-2">
                        <button className="flex items-center gap-2 bg-[#00f2fe] text-black px-4 py-2.5 rounded-xl font-bold text-sm hover:brightness-110 shadow-lg">
                          <Upload className="w-4 h-4" /> Share to TikTok
                        </button>
                        <button 
                          onClick={() => {
                            const clip = generatedClips[activeClipIndex];
                            const currentName = clip.content_title || clip.title || `Viral_Clip_${activeClipIndex + 1}`;
                            
                            // Extract the filename from the URL (e.g. "/outputs/clip_0.mp4" -> "clip_0.mp4")
                            const url = clip.url || clip;
                            const parts = url.split('/');
                            const filename = parts[parts.length - 1];
                            
                            const baseUrl = customBaseUrl || "http://127.0.0.1:8000";
                            const downloadUrl = `${baseUrl}/api/download_clip?file=${encodeURIComponent(filename)}&name=${encodeURIComponent(currentName)}`;
                            
                            // Use window.open or a hidden anchor to trigger download
                            window.open(downloadUrl, '_blank');
                          }}
                          className="flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-xl font-bold text-sm hover:brightness-110 shadow-lg"
                        >
                          <Download className="w-4 h-4" /> Download {quality.toUpperCase()}
                        </button>
                      </div>
                   </div>
                   
                   <input
                     type="text"
                     value={generatedClips[activeClipIndex].content_title || generatedClips[activeClipIndex].title || `Viral Clip #${activeClipIndex + 1}`}
                     onChange={(e) => {
                       const newClips = [...generatedClips];
                       newClips[activeClipIndex] = { ...newClips[activeClipIndex], content_title: e.target.value };
                       setGeneratedClips(newClips);
                     }}
                     className="text-2xl font-bold text-white mb-2 leading-tight bg-transparent border-b border-transparent hover:border-white/20 focus:border-amber-400 focus:outline-none transition-colors w-full p-1"
                   />
                   
                   <p className="text-sm text-gray-400 mb-8 border-b border-white/10 pb-6 px-1">
                     {generatedClips[activeClipIndex].reason || generatedClips[activeClipIndex].content_description}
                   </p>
                  
                  <div className="flex-1 bg-[#141414] rounded-2xl border border-white/5 p-6 overflow-y-auto shadow-inner">
                     <div className="flex justify-between items-center mb-6">
                       <h3 className="text-white font-bold text-sm">Scene Analysis & Transcript</h3>
                       <div className="flex items-center gap-2 text-xs text-gray-500">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> AI Curated
                       </div>
                     </div>
                     <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                        {/* Fake transcript for demo purposes based on title if no real transcript is passed */}
                        <span className="text-amber-400 font-mono text-xs mr-3">[00:00 - 00:30]</span>
                        {generatedClips[activeClipIndex].title} is an incredible viral moment that hooks the viewer instantly. The pacing and delivery keep retention extremely high. 
                        {"\n\n"}
                        <span className="text-amber-400 font-mono text-xs mr-3">[Analysis]</span>
                        The AI successfully detected the core climax of this topic and applied dynamic Opus-style word-by-word bouncy text effects.
                     </p>
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* ── SAVED CLIPS VAULT WINDOW / VIEW ── */}
        {viewMode === "vault" && (
          <div className="flex-1 bg-[#0a0a0a] overflow-y-auto p-8 animate-fadeIn relative flex flex-col">
            {/* Vault Header Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-6 border-b border-white/10">
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center">
                    <FolderCheck className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white flex items-center gap-3">
                      My Saved Clips Vault
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-400 border border-amber-400/30 font-bold">
                        {vaultClips.length} Saved Clips
                      </span>
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Organize your AI compiled videos into custom folders. All videos stay permanently stored on your machine!
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => setShowNewFolderModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-amber-400 text-black font-black text-xs hover:bg-amber-300 transition-all shadow-[0_0_20px_rgba(251,191,36,0.4)] flex items-center gap-2 cursor-pointer"
                >
                  <FolderPlus className="w-4 h-4 text-black" /> + New Folder
                </button>

                <button
                  onClick={() => openOutputFolder()}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/10 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <FolderOpen className="w-4 h-4 text-amber-400" /> Open in Explorer
                </button>

                <button
                  onClick={async () => {
                    if ((window as any).electronAPI?.selectDirectory) {
                      const dest = await (window as any).electronAPI.selectDirectory();
                      if (dest) {
                        const allPaths = vaultClips.map(c => c.path);
                        await fetch("http://127.0.0.1:8000/api/copy_clips", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ destination_dir: dest, file_paths: allPaths })
                        });
                        setExportNotice(`Successfully exported ${allPaths.length} clips to: ${dest}`);
                        setTimeout(() => setExportNotice(""), 5000);
                        if ((window as any).electronAPI?.openPath) {
                          await (window as any).electronAPI.openPath(dest);
                        }
                      }
                    }
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-bold text-xs border border-white/10 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-amber-400" /> Export All...
                </button>

                <button
                  onClick={loadVaultClips}
                  disabled={vaultLoading}
                  className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-bold text-xs border border-white/10 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${vaultLoading ? "animate-spin text-amber-400" : ""}`} /> Refresh
                </button>
              </div>
            </div>

            {/* Folder Navigation Chips & Quick New Folder with Drag-and-Drop Drop Zones */}
            <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-3 scrollbar-none">
              <button
                onClick={() => setVaultSelectedFolder("all")}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setDragOverFolder("Main Library");
                }}
                onDragLeave={() => setDragOverFolder(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  const clipPath = e.dataTransfer.getData("text/plain") || draggedClipPath;
                  if (clipPath) handleMoveClips([clipPath], "Main Library");
                  setDragOverFolder(null);
                  setDraggedClipPath(null);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  vaultSelectedFolder === "all"
                    ? "bg-amber-400 text-black shadow-md"
                    : "bg-[#141414] text-gray-400 hover:text-white hover:bg-white/10 border border-white/10"
                }`}
              >
                <Folder className="w-3.5 h-3.5" /> All Clips ({vaultClips.length})
              </button>

              {vaultFolders.map(folder => {
                const count = vaultClips.filter(c => c.folder === folder).length;
                const isDragOver = dragOverFolder === folder;
                return (
                  <button
                    key={folder}
                    onClick={() => setVaultSelectedFolder(folder)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      setDragOverFolder(folder);
                    }}
                    onDragLeave={() => {
                      if (dragOverFolder === folder) setDragOverFolder(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const clipPath = e.dataTransfer.getData("text/plain") || draggedClipPath;
                      if (clipPath) {
                        handleMoveClips([clipPath], folder);
                      }
                      setDragOverFolder(null);
                      setDraggedClipPath(null);
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer select-none ${
                      isDragOver
                        ? "bg-amber-400 text-black scale-110 ring-4 ring-amber-400/60 shadow-[0_0_30px_rgba(251,191,36,0.9)] z-10 animate-pulse"
                        : vaultSelectedFolder === folder
                        ? "bg-amber-400 text-black shadow-md"
                        : "bg-[#141414] text-gray-400 hover:text-white hover:bg-white/10 border border-white/10"
                    }`}
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-amber-400" /> {folder} ({count})
                  </button>
                );
              })}

              <button
                onClick={() => setShowNewFolderModal(true)}
                className="px-3 py-2 rounded-xl text-xs font-bold text-amber-400/90 hover:text-amber-300 hover:bg-amber-400/10 border border-dashed border-amber-400/40 transition-all shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> New Folder
              </button>
            </div>

            {/* Drag & Drop Hint Banner */}
            <div className="mb-4 px-3.5 py-1.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-[11px] text-gray-400">
              <span className="flex items-center gap-1.5">
                <Move className="w-3 h-3 text-amber-400" />
                <span><b className="text-amber-400">Mouse Drag & Drop:</b> Drag any video card directly onto a folder tab above to file it away instantly.</span>
              </span>
              <span className="text-[10px] text-gray-500 font-mono">Total {vaultClips.length} clips</span>
            </div>

            {/* Storage Path & Filter Toolbar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Search Bar */}
              <div className="relative flex items-center bg-[#111] border border-white/10 rounded-xl px-3 py-2">
                <Search className="w-4 h-4 text-gray-500 mr-2 shrink-0" />
                <input
                  type="text"
                  value={vaultSearch}
                  onChange={(e) => setVaultSearch(e.target.value)}
                  placeholder="Search saved clips by title..."
                  className="w-full bg-transparent text-xs text-white outline-none placeholder-gray-600"
                />
                {vaultSearch && (
                  <button onClick={() => setVaultSearch("")} className="text-gray-500 hover:text-white text-xs">✕</button>
                )}
              </div>

              {/* Folder Selector Dropdown */}
              <div className="flex items-center bg-[#111] border border-white/10 rounded-xl px-3 py-2">
                <Filter className="w-4 h-4 text-amber-400 mr-2 shrink-0" />
                <select
                  value={vaultSelectedFolder}
                  onChange={(e) => setVaultSelectedFolder(e.target.value)}
                  className="w-full bg-transparent text-xs text-white outline-none cursor-pointer"
                >
                  <option value="all" className="bg-[#111] text-white">Showing: All Folders ({vaultClips.length})</option>
                  {vaultFolders.map((f: any) => (
                    <option key={f} value={f} className="bg-[#111] text-white">📁 {f} ({vaultClips.filter(c => c.folder === f).length})</option>
                  ))}
                </select>
              </div>

              {/* Current Storage Path */}
              <div className="bg-[#111] border border-white/10 rounded-xl px-3 py-2 flex items-center justify-between gap-2 overflow-hidden">
                <span className="text-[10px] text-gray-500 font-bold uppercase shrink-0">Saved In:</span>
                <span className="text-xs font-mono text-amber-400/90 truncate" title={lastOutputFolder || "engine/clips"}>
                  {lastOutputFolder || "C:\\...\\engine\\clips"}
                </span>
              </div>
            </div>

            {/* Multi-Selection Batch Actions Bar */}
            {selectedClipPaths.length > 0 && (
              <div className="mb-4 p-3 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-between gap-4 animate-fadeIn">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                  <CheckSquare className="w-4 h-4 text-amber-400" />
                  <span>{selectedClipPaths.length} Clip(s) Selected</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setMoveModalClips(selectedClipPaths)}
                    className="px-3 py-1.5 rounded-xl bg-amber-400 text-black font-extrabold text-xs hover:bg-amber-300 transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <Folder className="w-3.5 h-3.5" /> Move to Folder...
                  </button>
                  <button
                    onClick={async () => {
                      for (const path of selectedClipPaths) {
                        await deleteVaultClip(path);
                      }
                      setSelectedClipPaths([]);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 font-bold text-xs hover:bg-red-500/30 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Selected
                  </button>
                  <button
                    onClick={() => setSelectedClipPaths([])}
                    className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {exportNotice && (
              <div className="mb-6 p-3.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold animate-fadeIn flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> {exportNotice}
              </div>
            )}

            {/* Clips Grid or Empty State */}
            {vaultLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20">
                <Loader2 className="w-10 h-10 text-amber-400 animate-spin mb-3" />
                <p className="text-sm font-bold text-gray-400">Loading your Saved Clips Vault...</p>
              </div>
            ) : vaultClips.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                  <FolderCheck className="w-10 h-10 text-gray-600" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">No Saved Clips Yet</h3>
                <p className="text-xs text-gray-500 max-w-sm mb-6">
                  When you run the AI Clipper, all compiled clips and metadata will automatically appear here forever.
                </p>
                <button
                  onClick={() => setViewMode("setup")}
                  className="px-5 py-2.5 rounded-xl bg-amber-400 text-black font-extrabold text-xs hover:bg-amber-300 transition-all shadow-md"
                >
                  Go to Clipper Studio ⚡
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
                {vaultClips
                  .filter(c => {
                    const matchesSearch = c.title.toLowerCase().includes(vaultSearch.toLowerCase()) || c.filename.toLowerCase().includes(vaultSearch.toLowerCase());
                    const matchesFolder = vaultSelectedFolder === "all" || c.folder === vaultSelectedFolder;
                    return matchesSearch && matchesFolder;
                  })
                  .map((clip) => {
                    const isSelected = selectedClipPaths.includes(clip.path);
                    const isBeingDragged = draggedClipPath === clip.path;
                    return (
                      <div
                        key={clip.path}
                        draggable={true}
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", clip.path);
                          e.dataTransfer.effectAllowed = "move";
                          setDraggedClipPath(clip.path);
                        }}
                        onDragEnd={() => {
                          setDraggedClipPath(null);
                          setDragOverFolder(null);
                        }}
                        className={`bg-[#141414] rounded-2xl border transition-all group flex flex-col overflow-hidden relative cursor-grab active:cursor-grabbing ${
                          isBeingDragged ? "opacity-30 scale-95 border-dashed border-amber-400" :
                          isSelected ? "border-amber-400 ring-2 ring-amber-400/40" : "border-white/5 hover:border-amber-400/50"
                        }`}
                      >
                        {/* Video Player / Thumbnail */}
                        <div 
                          className="relative w-full aspect-[9/16] bg-black overflow-hidden cursor-pointer"
                          onClick={() => setPreviewVaultClip(clip)}
                        >
                          <video
                            src={clip.url}
                            preload="metadata"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          
                          {/* Selection Checkbox */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedClipPaths(prev => 
                                isSelected ? prev.filter(p => p !== clip.path) : [...prev, clip.path]
                              );
                            }}
                            className="absolute top-2 left-2 z-20 p-1.5 rounded-lg bg-black/80 hover:bg-black text-white border border-white/20 transition-all cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-amber-400" />
                            ) : (
                              <Square className="w-4 h-4 text-gray-400 hover:text-white" />
                            )}
                          </button>

                          <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-bold text-white border border-white/10">
                            {clip.size_mb} MB
                          </div>
                          
                          <div className="absolute bottom-2 left-2 bg-amber-400/90 text-black px-2 py-0.5 rounded-md text-[10px] font-extrabold shadow-lg flex items-center gap-1">
                            <Zap className="w-3 h-3 fill-black"/> Score: {clip.virality_score || 99}
                          </div>

                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                            <div className="w-12 h-12 bg-amber-400/90 backdrop-blur-md rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity transform scale-75 group-hover:scale-100 shadow-xl">
                              <Play className="w-5 h-5 fill-black text-black ml-0.5" />
                            </div>
                          </div>
                        </div>

                        {/* Card Content & Actions */}
                        <div className="p-4 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between gap-1.5 mb-1.5">
                              <span className="text-[9px] bg-white/10 px-2 py-0.5 rounded-full text-gray-300 font-bold truncate max-w-[140px]">
                                📁 {clip.folder}
                              </span>
                              <button
                                type="button"
                                onClick={() => setMoveModalClips([clip.path])}
                                className="text-[10px] text-amber-400/90 hover:text-amber-300 hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                              >
                                Move <ArrowRight className="w-2.5 h-2.5" />
                              </button>
                            </div>
                            <h3 className="font-bold text-sm text-white line-clamp-2 leading-tight">
                              {clip.title}
                            </h3>
                            {clip.description && (
                              <p className="text-[10px] text-gray-500 mt-2 line-clamp-2">
                                {clip.description}
                              </p>
                            )}
                          </div>

                          {/* Card Actions Footer */}
                          <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                if ((window as any).electronAPI?.showItemInFolder) {
                                  (window as any).electronAPI.showItemInFolder(clip.path);
                                } else {
                                  openOutputFolder();
                                }
                              }}
                              className="text-[11px] text-amber-400 hover:text-amber-300 font-bold transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <FolderOpen className="w-3.5 h-3.5" /> Reveal
                            </button>

                            <button
                              type="button"
                              onClick={() => deleteVaultClip(clip.path)}
                              className="text-[11px] text-red-400/70 hover:text-red-400 bg-red-400/10 hover:bg-red-400/20 px-2.5 py-1 rounded-lg font-bold transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" /> Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* CREATE NEW FOLDER MODAL */}
            {showNewFolderModal && (
              <div 
                className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-fadeIn"
                onClick={() => setShowNewFolderModal(false)}
              >
                <div 
                  className="bg-[#141414] border border-amber-400/40 rounded-3xl p-6 max-w-md w-full shadow-2xl relative flex flex-col gap-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <FolderPlus className="w-5 h-5 text-amber-400" /> Create New Folder
                    </h3>
                    <button onClick={() => setShowNewFolderModal(false)} className="text-gray-400 hover:text-white">✕</button>
                  </div>
                  <p className="text-xs text-gray-400">
                    Create a dedicated folder to organize and compile your AI videos (e.g. "AMP Chameleon", "Gaming Highlights", "Podcasts").
                  </p>
                  <input
                    type="text"
                    autoFocus
                    value={newFolderNameInput}
                    onChange={(e) => setNewFolderNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateFolder(newFolderNameInput);
                    }}
                    placeholder="Enter folder name..."
                    className="w-full bg-black border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-amber-400 transition-colors"
                  />
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={() => setShowNewFolderModal(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleCreateFolder(newFolderNameInput)}
                      disabled={!newFolderNameInput.trim()}
                      className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-amber-400 text-black hover:bg-amber-300 transition-all disabled:opacity-50 shadow-lg cursor-pointer"
                    >
                      Create Folder
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* MOVE CLIPS MODAL */}
            {moveModalClips && (
              <div 
                className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-fadeIn"
                onClick={() => setMoveModalClips(null)}
              >
                <div 
                  className="bg-[#141414] border border-white/20 rounded-3xl p-6 max-w-md w-full shadow-2xl relative flex flex-col gap-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <Folder className="w-5 h-5 text-amber-400" /> Move {moveModalClips.length} Clip(s) To:
                    </h3>
                    <button onClick={() => setMoveModalClips(null)} className="text-gray-400 hover:text-white">✕</button>
                  </div>
                  <p className="text-xs text-gray-400">
                    Select the destination folder to organize these videos:
                  </p>
                  <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                    {vaultFolders.map(folder => (
                      <button
                        key={folder}
                        onClick={() => handleMoveClips(moveModalClips, folder)}
                        className="w-full text-left px-4 py-3 rounded-xl bg-white/5 hover:bg-amber-400/20 border border-white/10 hover:border-amber-400/50 text-white font-bold text-xs flex items-center justify-between transition-all cursor-pointer group"
                      >
                        <span className="flex items-center gap-2">
                          <FolderOpen className="w-4 h-4 text-amber-400" /> {folder}
                        </span>
                        <span className="text-[10px] text-gray-500 group-hover:text-amber-300">Move Here →</span>
                      </button>
                    ))}
                  </div>
                  <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                    <button
                      onClick={() => {
                        setMoveModalClips(null);
                        setShowNewFolderModal(true);
                      }}
                      className="text-xs text-amber-400 hover:underline font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Create new folder first
                    </button>
                    <button
                      onClick={() => setMoveModalClips(null)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Preview Modal for Vault Clip */}
            {previewVaultClip && (
              <div 
                className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-fadeIn"
                onClick={() => setPreviewVaultClip(null)}
              >
                <div 
                  className="bg-[#111] border border-white/15 rounded-3xl p-6 max-w-4xl w-full flex flex-col md:flex-row gap-6 shadow-2xl relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => setPreviewVaultClip(null)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white text-base bg-white/5 hover:bg-white/10 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                  >
                    ✕
                  </button>

                  {/* 9:16 Video Player */}
                  <div className="w-full md:w-80 aspect-[9/16] bg-black rounded-2xl overflow-hidden border border-white/10 shadow-inner shrink-0">
                    <video
                      src={previewVaultClip.url}
                      autoPlay
                      loop
                      controls
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Details & Actions */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs bg-amber-400/20 text-amber-400 border border-amber-400/30 px-2.5 py-0.5 rounded-full font-bold">
                          Score: {previewVaultClip.virality_score || 99} pts
                        </span>
                        <span className="text-xs bg-white/10 text-gray-300 px-2.5 py-0.5 rounded-full font-bold">
                          📁 {previewVaultClip.folder}
                        </span>
                      </div>

                      <h3 className="text-xl font-bold text-white mb-2 leading-snug">
                        {previewVaultClip.title}
                      </h3>

                      <p className="text-xs text-gray-400 font-mono mb-4">
                        File: {previewVaultClip.filename} ({previewVaultClip.size_mb} MB)
                      </p>

                      {previewVaultClip.description && (
                        <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-xs text-gray-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto mb-4">
                          {previewVaultClip.description}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 pt-4 border-t border-white/10 flex-wrap">
                      <button
                        onClick={() => {
                          setPreviewVaultClip(null);
                          setMoveModalClips([previewVaultClip.path]);
                        }}
                        className="px-4 py-2 rounded-xl bg-amber-400 text-black font-bold text-xs hover:bg-amber-300 transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <Folder className="w-4 h-4" /> Move to Folder...
                      </button>

                      <button
                        onClick={() => {
                          if ((window as any).electronAPI?.showItemInFolder) {
                            (window as any).electronAPI.showItemInFolder(previewVaultClip.path);
                          } else {
                            openOutputFolder();
                          }
                        }}
                        className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/10 transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <FolderOpen className="w-4 h-4 text-amber-400" /> Reveal File
                      </button>

                      <button
                        onClick={() => deleteVaultClip(previewVaultClip.path)}
                        className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-xs border border-red-500/20 transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" /> Delete Clip
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

function Section({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-widest mb-2.5 text-amber-400">{title}</h3>
      {children}
    </div>
  );
}
