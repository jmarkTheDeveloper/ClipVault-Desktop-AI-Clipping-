import React, { useState, useRef, useEffect } from "react";
import { ArrowLeft, Zap, FolderCheck, Cpu, Download, Folder, Plus, FolderOpen, AlertCircle, HardDrive, ShieldCheck, Sparkles } from "lucide-react";
import { EngineSettingsModal } from "../components/clipper/EngineSettingsModal";
import { CropEditorModal } from "../components/clipper/CropEditorModal";
import { SetupSidebar } from "../components/clipper/SetupSidebar";
import { PhonePreview } from "../components/clipper/PhonePreview";
import { SavedClipsVault } from "../components/clipper/SavedClipsVault";
import { GalleryView } from "../components/clipper/GalleryView";
import { ClipDetailsModal } from "../components/clipper/ClipDetailsModal";
import { extractYouTubeId } from "../components/clipper/types";
import type { ViewMode, ClipMetadata, CropBox, EngineOption } from "../components/clipper/types";

interface Props {
  onBack: () => void;
  onOpenEditor?: (url: string) => void;
  initialViewMode?: ViewMode;
  onStartTour?: () => void;
  onStartVaultTour?: () => void;
  onTriggerVaultWelcome?: () => void;
}

const AI_ENGINES: EngineOption[] = [
  // Local Hardware AI (100% Free, On-Device, Offline)
  {
    id: "intel_ai",
    name: "Intel AI Engine",
    desc: "Core Ultra and Arc GPU and NPU via OpenVINO and QuickSync (Free & Offline)",
    category: "local-hardware",
    badge: "Hardware NPU",
    providerType: "local",
    isHardware: true
  },
  {
    id: "ryzen_ai",
    name: "AMD Ryzen AI",
    desc: "Ryzen NPU and Radeon ROCm / DirectML on-device acceleration",
    category: "local-hardware",
    badge: "Ryzen NPU",
    providerType: "local",
    isHardware: true
  },
  {
    id: "nvidia_rtx",
    name: "NVIDIA RTX AI",
    desc: "TensorRT, CUDA, and NVENC hardware acceleration",
    category: "local-hardware",
    badge: "RTX Tensor",
    providerType: "local",
    isHardware: true
  },

  // Ultra-Fast Cloud
  {
    id: "groq_lpu",
    name: "Groq LPU Engine",
    desc: "Ultra-Fast Llama 3.3 70B and Whisper at 500+ tok/s (Real-Time)",
    category: "ultra-fast",
    badge: "500+ t/s",
    providerType: "cloud"
  },
  {
    id: "deepseek",
    name: "DeepSeek V3 / R1",
    desc: "Deep Reasoning and High-Engagement Viral Clip Hook Analysis",
    category: "ultra-fast",
    badge: "Reasoning",
    providerType: "cloud"
  },
  {
    id: "moonlight",
    name: "Moonlight AI",
    desc: "Moonshot Kimi Long-Context Video and Narrative Clipper",
    category: "ultra-fast",
    badge: "Long Context",
    providerType: "cloud"
  },

  // Frontier Cloud LLMs
  {
    id: "openai_chatgpt",
    name: "OpenAI ChatGPT",
    desc: "GPT-4o, OpenAI Sora, and Cloud Whisper Audio Engine",
    category: "frontier-llm",
    badge: "GPT-4o",
    providerType: "cloud"
  },
  {
    id: "claude_fable",
    name: "Anthropic Claude",
    desc: "Claude 3.7 and 3.5 Sonnet Viral Script and Hook Specialist",
    category: "frontier-llm",
    badge: "Claude 3.7",
    providerType: "cloud"
  },
  {
    id: "gemini_flash",
    name: "Google Gemini",
    desc: "Gemini 2.5 Flash / 2.0 Pro Multimodal Video Understanding",
    category: "frontier-llm",
    badge: "Gemini 2.5",
    providerType: "cloud"
  },
  {
    id: "qwen_ai",
    name: "Alibaba Qwen",
    desc: "Qwen 2.5 72B and Qwen-VL Video Analysis via DashScope",
    category: "frontier-llm",
    badge: "Qwen 2.5",
    providerType: "cloud"
  },

  // Video Generation and Motion
  {
    id: "higgsfield",
    name: "Higgsfield AI",
    desc: "Cinematic Camera Motion and Video Generation",
    category: "video-gen",
    badge: "Camera FX",
    providerType: "cloud"
  },
  {
    id: "seedance",
    name: "SeeDance AI",
    desc: "ByteDance Music Beat Sync and Dynamic Dance Highlights",
    category: "video-gen",
    badge: "Beat Sync",
    providerType: "cloud"
  },
];

export const AiClipperScreen: React.FC<Props> = ({ 
  onBack, 
  initialViewMode = "setup", 
  onStartTour,
  onStartVaultTour,
  onTriggerVaultWelcome,
}) => {
  // Navigation & View States
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  
  useEffect(() => {
    if (initialViewMode) setViewMode(initialViewMode);
  }, [initialViewMode]);

  // Auto-Fetch Clips & First-Time Saved Vault Tutorial Trigger
  useEffect(() => {
    if (viewMode === "vault") {
      loadVaultClips(false);
      try {
        const vaultTourDone = localStorage.getItem("clipvault_vault_tour_completed");
        if (!vaultTourDone && onTriggerVaultWelcome) {
          onTriggerVaultWelcome();
        }
      } catch {}
    }
  }, [viewMode, onTriggerVaultWelcome]);

  const [showKeySettings, setShowKeySettings] = useState(false);
  const [showRateLimitModal, setShowRateLimitModal] = useState(false);
  const [selectedEngine, setSelectedEngine] = useState(() => localStorage.getItem("clipvault_selected_engine") || "gemini_flash");
  const [byokMode, setByokMode] = useState<"local" | "custom">(() => {
    const saved = localStorage.getItem("clipvault_byok_mode");
    if (saved === "local" || saved === "custom") return saved as "local" | "custom";
    return "custom";
  });

  // API Keys with LocalStorage Persistence
  const [anthropicKey, setAnthropicKey] = useState(() => localStorage.getItem("clipvault_anthropic_key") || "");
  const [higgsfieldKey, setHiggsfieldKey] = useState(() => localStorage.getItem("clipvault_higgsfield_key") || "");
  const [seeDanceKey, setSeeDanceKey] = useState(() => localStorage.getItem("clipvault_seedance_key") || "");
  const [openAiKey, setOpenAiKey] = useState(() => localStorage.getItem("clipvault_openai_key") || "");
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem("clipvault_gemini_key") || "");
  const [groqKey, setGroqKey] = useState(() => localStorage.getItem("clipvault_groq_key") || "");
  const [deepseekKey, setDeepseekKey] = useState(() => localStorage.getItem("clipvault_deepseek_key") || "");
  const [moonlightKey, setMoonlightKey] = useState(() => localStorage.getItem("clipvault_moonlight_key") || "");
  const [qwenKey, setQwenKey] = useState(() => localStorage.getItem("clipvault_qwen_key") || "");
  const [customBaseUrl, setCustomBaseUrl] = useState(() => localStorage.getItem("clipvault_custom_base_url") || "");

  // Active Engine & API Key Pre-Flight Detection
  const getActiveEngineApiKey = (engineId: string = selectedEngine) => {
    switch (engineId) {
      case "openai_chatgpt":
        return openAiKey.trim() || localStorage.getItem("clipvault_openai_key")?.trim() || "";
      case "claude_fable":
        return anthropicKey.trim() || localStorage.getItem("clipvault_anthropic_key")?.trim() || "";
      case "gemini_flash":
        return geminiKey.trim() || localStorage.getItem("clipvault_gemini_key")?.trim() || "";
      case "groq_lpu":
        return groqKey.trim() || localStorage.getItem("clipvault_groq_key")?.trim() || "";
      case "deepseek":
        return deepseekKey.trim() || localStorage.getItem("clipvault_deepseek_key")?.trim() || "";
      case "moonlight":
        return moonlightKey.trim() || localStorage.getItem("clipvault_moonlight_key")?.trim() || "";
      case "qwen_ai":
      case "qwen":
        return qwenKey.trim() || localStorage.getItem("clipvault_qwen_key")?.trim() || "";
      case "higgsfield":
        return higgsfieldKey.trim() || localStorage.getItem("clipvault_higgsfield_key")?.trim() || "";
      case "seedance":
        return seeDanceKey.trim() || localStorage.getItem("clipvault_seedance_key")?.trim() || "";
      default:
        return "";
    }
  };

  const activeEngineObj = AI_ENGINES.find((e) => e.id === selectedEngine);
  const isCloudEngine = activeEngineObj?.providerType === "cloud" || byokMode === "custom";
  const activeEngineKey = getActiveEngineApiKey(selectedEngine);
  const isKeyMissingForActiveEngine = isCloudEngine && !activeEngineKey;
  const activeEngineName = activeEngineObj?.name || "Cloud AI";

  // Update localStorage when keys/engines change
  useEffect(() => {
    localStorage.setItem("clipvault_selected_engine", selectedEngine);
  }, [selectedEngine]);

  useEffect(() => {
    localStorage.setItem("clipvault_byok_mode", byokMode);
  }, [byokMode]);

  const isVaultLoadedRef = useRef(false);

  // 1. Initial on-device persistent vault load & auto hardware scan
  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/vault_keys")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.keys) {
          const k = data.keys;
          if (k.gemini) { setGeminiKey(k.gemini); localStorage.setItem("clipvault_gemini_key", k.gemini); }
          if (k.openai) { setOpenAiKey(k.openai); localStorage.setItem("clipvault_openai_key", k.openai); }
          if (k.anthropic) { setAnthropicKey(k.anthropic); localStorage.setItem("clipvault_anthropic_key", k.anthropic); }
          if (k.groq) { setGroqKey(k.groq); localStorage.setItem("clipvault_groq_key", k.groq); }
          if (k.deepseek) { setDeepseekKey(k.deepseek); localStorage.setItem("clipvault_deepseek_key", k.deepseek); }
          if (k.moonlight) { setMoonlightKey(k.moonlight); localStorage.setItem("clipvault_moonlight_key", k.moonlight); }
          if (k.qwen) { setQwenKey(k.qwen); localStorage.setItem("clipvault_qwen_key", k.qwen); }
          if (k.higgsfield) { setHiggsfieldKey(k.higgsfield); localStorage.setItem("clipvault_higgsfield_key", k.higgsfield); }
          if (k.seedance) { setSeeDanceKey(k.seedance); localStorage.setItem("clipvault_seedance_key", k.seedance); }
          if (k.custom_base_url) { setCustomBaseUrl(k.custom_base_url); localStorage.setItem("clipvault_custom_base_url", k.custom_base_url); }
        }
        isVaultLoadedRef.current = true;
      })
      .catch(() => {
        isVaultLoadedRef.current = true;
      });

    // Automatically detect Intel Core Ultra CPU, Arc GPU, and AI Boost NPU on startup
    fetch("http://127.0.0.1:8000/api/hardware_scan")
      .then((r) => r.json())
      .then((data) => {
        if (data && data.engine_id) {
          localStorage.setItem("clipvault_hardware_scan", JSON.stringify(data));
        }
      })
      .catch(() => {});
  }, []);

  // 2. Save keys ONLY after initial load and only with non-empty values
  useEffect(() => {
    if (!isVaultLoadedRef.current) return;

    localStorage.setItem("clipvault_anthropic_key", anthropicKey);
    localStorage.setItem("clipvault_higgsfield_key", higgsfieldKey);
    localStorage.setItem("clipvault_seedance_key", seeDanceKey);
    localStorage.setItem("clipvault_openai_key", openAiKey);
    localStorage.setItem("clipvault_gemini_key", geminiKey);
    localStorage.setItem("clipvault_groq_key", groqKey);
    localStorage.setItem("clipvault_deepseek_key", deepseekKey);
    localStorage.setItem("clipvault_moonlight_key", moonlightKey);
    localStorage.setItem("clipvault_qwen_key", qwenKey);
    localStorage.setItem("clipvault_custom_base_url", customBaseUrl);

    // Save to hidden local file on disk
    const keysPayload: Record<string, string> = {};
    if (geminiKey) keysPayload.gemini = geminiKey;
    if (openAiKey) keysPayload.openai = openAiKey;
    if (anthropicKey) keysPayload.anthropic = anthropicKey;
    if (groqKey) keysPayload.groq = groqKey;
    if (deepseekKey) keysPayload.deepseek = deepseekKey;
    if (moonlightKey) keysPayload.moonlight = moonlightKey;
    if (qwenKey) keysPayload.qwen = qwenKey;
    if (higgsfieldKey) keysPayload.higgsfield = higgsfieldKey;
    if (seeDanceKey) keysPayload.seedance = seeDanceKey;
    if (customBaseUrl) keysPayload.custom_base_url = customBaseUrl;

    if (Object.keys(keysPayload).length > 0) {
      fetch("http://127.0.0.1:8000/api/save_vault_keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys: keysPayload })
      }).catch(() => {});
    }
  }, [anthropicKey, higgsfieldKey, seeDanceKey, openAiKey, geminiKey, groqKey, deepseekKey, moonlightKey, qwenKey, customBaseUrl]);

  // Input & Media
  const [inputType, setInputType] = useState<"youtube" | "local">("youtube");
  const [ytUrl, setYtUrl] = useState("");
  const [localFilePath, setLocalFilePath] = useState("");
  const [activeVideoUrl, setActiveVideoUrl] = useState("");
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Processing Parameters
  const [quality, setQuality] = useState("1080p");
  const [layout, setLayout] = useState("vertical_crop");
  const [cameraStyle, setCameraStyle] = useState<"instant" | "snappy" | "smooth">("instant");
  const [durationMode, setDurationMode] = useState("auto");
  const [numClips, setNumClips] = useState<number | string>(3);
  const [targetDuration, setTargetDuration] = useState<number | string>(30);
  const [topicPrompt, setTopicPrompt] = useState("");
  const [customOutputDir, setCustomOutputDir] = useState(() => localStorage.getItem("clipvault_custom_output_dir") || "");
  const [customFolderName, setCustomFolderName] = useState("");
  const [exportFileName, setExportFileName] = useState("");
  const [transcriptionLanguage, setTranscriptionLanguage] = useState("auto");
  const [autoBroll, setAutoBroll] = useState(false);
  const [addBgMusic, setAddBgMusic] = useState(false);
  const [bgMusicVol, setBgMusicVol] = useState(0.1);
  const [autoSfx, setAutoSfx] = useState(true);
  const [addCaptions, setAddCaptions] = useState(true);
  const [captionYPct, setCaptionYPct] = useState(70);
  const [selectedEffectId, setSelectedEffectId] = useState("capcut_yellow");
  const [avoidCopyright, setAvoidCopyright] = useState(false);
  const [startTs, setStartTs] = useState("");
  const [endTs, setEndTs] = useState("");

  // Crop Editor State
  const [cropModalOpen, setCropModalOpen] = useState<"none" | "top" | "bottom">("none");
  const [cropTop, setCropTop] = useState<CropBox>({ x: 20, y: 130, width: 140, height: 110 });
  const [cropBottom, setCropBottom] = useState<CropBox>({ x: 0, y: 0, width: 456, height: 256 });

  // Progress & Execution
  const [running, setRunning] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [generatedClips, setGeneratedClips] = useState<any[]>([]);
  const [activeClipIndex, setActiveClipIndex] = useState(0);
  const [lastOutputFolder, setLastOutputFolder] = useState("");

  // Phone Preview State
  const [isMuted, setIsMuted] = useState(true);
  const [isDraggingCaption, setIsDraggingCaption] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Saved Clips Vault State
  const [vaultClips, setVaultClips] = useState<ClipMetadata[]>([]);
  const [vaultFolders, setVaultFolders] = useState<string[]>(["Main Library"]);
  const [vaultLoading, setVaultLoading] = useState(false);
  const [vaultSearch, setVaultSearch] = useState("");
  const [vaultSelectedFolder, setVaultSelectedFolder] = useState("all");
  const [selectedClipPaths, setSelectedClipPaths] = useState<string[]>([]);
  const [draggedClipPath, setDraggedClipPath] = useState<string | null>(null);
  const [previewVaultClip, setPreviewVaultClip] = useState<ClipMetadata | null>(null);
  const [moveModalClips, setMoveModalClips] = useState<string[] | null>(null);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderNameInput, setNewFolderNameInput] = useState("");
  const [newFolderParent, setNewFolderParent] = useState<string>("root");
  const [exportNotice, setExportNotice] = useState("");
  const newFolderInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (showNewFolderModal) {
      const timer = setTimeout(() => {
        if (newFolderInputRef.current) {
          newFolderInputRef.current.focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [showNewFolderModal]);

  // Satisfying Gameplay & Background Assets
  const [gameplayBgVideo, setGameplayBgVideo] = useState("");
  const [bgMusicFile, setBgMusicFile] = useState("");
  const [backgroundVideos, setBackgroundVideos] = useState<Array<{ name: string; path: string; url: string; size: number }>>([]);
  const [backgroundTracks, setBackgroundTracks] = useState<Array<{ name: string; path: string; url: string; size: number }>>([]);

  // Gallery Multi-Select
  const [gallerySelectedClips, setGallerySelectedClips] = useState<number[]>([]);
  const [galleryTargetFolder, setGalleryTargetFolder] = useState("");
  const [galleryRandomFolder, setGalleryRandomFolder] = useState("Random & Unsorted");
  const [isSortingGallery, setIsSortingGallery] = useState(false);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentTaskIdRef = useRef<string | null>(null);

  // Load Saved Clips Vault
  const loadVaultClips = async (silent = false) => {
    if (!silent) setVaultLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/saved_clips");
      if (res.ok) {
        const data = await res.json();
        setVaultClips(data.clips || []);
        setVaultFolders(data.folders || ["Main Library"]);
        if (data.storage_dir || data.output_dir) setLastOutputFolder(data.storage_dir || data.output_dir);
      }
    } catch (err) {
      console.error("Failed to load vault clips:", err);
    } finally {
      setVaultLoading(false);
    }
  };

  const loadBackgroundAssets = async () => {
    try {
      const [resBg, resMus] = await Promise.all([
        fetch("http://127.0.0.1:8000/api/background_videos").then((r) => r.json()).catch(() => ({ videos: [] })),
        fetch("http://127.0.0.1:8000/api/background_music").then((r) => r.json()).catch(() => ({ tracks: [] })),
      ]);
      if (resBg.videos && resBg.videos.length > 0) {
        setBackgroundVideos(resBg.videos);
        if (!gameplayBgVideo) {
          setGameplayBgVideo(resBg.videos[0].path || resBg.videos[0].url);
        }
      }
      if (resMus.tracks && resMus.tracks.length > 0) {
        setBackgroundTracks(resMus.tracks);
      }
    } catch (err) {
      console.warn("Could not load background assets:", err);
    }
  };

  const handleUploadBackgroundVideo = async (file: File) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/upload_background_video", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        setGameplayBgVideo(data.url || data.path);
        setExportNotice(`✓ Imported gameplay video: "${data.name}"`);
        setTimeout(() => setExportNotice(""), 5000);
        loadBackgroundAssets();
      } else {
        alert(data.error || "Failed to upload gameplay video");
      }
    } catch (err) {
      console.error("Error uploading gameplay video:", err);
    }
  };

  const handleUploadBackgroundMusic = async (file: File) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/upload_background_music", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        setBgMusicFile(data.url || data.path);
        setExportNotice(`✓ Imported soundtrack track: "${data.name}"`);
        setTimeout(() => setExportNotice(""), 5000);
        loadBackgroundAssets();
      } else {
        alert(data.error || "Failed to upload soundtrack");
      }
    } catch (err) {
      console.error("Error uploading soundtrack:", err);
    }
  };

  useEffect(() => {
    loadVaultClips();
    loadBackgroundAssets();
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // Automatically fetch YouTube stream preview when user types or pastes YouTube link
  useEffect(() => {
    if (inputType !== "youtube") {
      if (localFilePath) {
        const localUrl = `http://127.0.0.1:8000/stream?path=${encodeURIComponent(localFilePath)}`;
        setActiveVideoUrl(localUrl);
      }
      return;
    }

    const videoId = extractYouTubeId(ytUrl);
    if (!videoId) {
      setActiveVideoUrl("");
      return;
    }

    let isMounted = true;
    const timer = setTimeout(async () => {
      setLoadingPreview(true);
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/video_info?url=${encodeURIComponent(ytUrl)}`);
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.stream_url || data.url) {
            setActiveVideoUrl(data.stream_url || data.url);
          }
        }
      } catch (err) {
        console.error("YouTube preview stream note:", err);
      } finally {
        if (isMounted) setLoadingPreview(false);
      }
    }, 400);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [ytUrl, inputType, localFilePath]);

  // Run AI Clipper Pipeline
  const runClipper = async () => {
    setErrorMsg("");

    // Step 1: Detect if the active engine shown in the header requires an API key and verify it
    if (isKeyMissingForActiveEngine) {
      const missingKeyWarning = `Oops! You have not yet put any API key for ${activeEngineName}. Please enter your API key to proceed.`;
      setErrorMsg(missingKeyWarning);
      setExportNotice(`⚠️ Key Required: ${activeEngineName}`);
      setTimeout(() => setExportNotice(""), 6000);
      setShowKeySettings(true);
      return;
    }

    // Step 2: Validate video input source
    const activeUrl = inputType === "youtube" ? ytUrl : localFilePath;
    if (!activeUrl) {
      setErrorMsg("Please provide a valid YouTube URL or select a local video file.");
      return;
    }

    setRunning(true);
    setProgress(5);
    setStatusText("Initializing AI Clipper Engine...");
    setDone(false);

    try {
      // STRICT VALIDATION & REJECTION: For Satisfying Gameplay Split, a background video MUST be imported/selected
      if (layout === "gameplay_bg") {
        if (!gameplayBgVideo || gameplayBgVideo.trim() === "") {
          const rejectMsg = "❌ Rejection: No background video found! For 'Satisfying Gameplay Split', you must import or select a background gameplay video before compiling.";
          setErrorMsg(rejectMsg);
          setExportNotice(rejectMsg);
          setTimeout(() => setExportNotice(""), 8000);
          setRunning(false);
          alert(rejectMsg);
          return;
        }
      }

      // Parse custom timestamps ONLY if duration mode is custom
      let customRange: number[] | null = null;
      let calculatedTargetDuration = durationMode === "auto" ? (parseInt(targetDuration.toString()) || 30) : -1;

      if (durationMode === "custom") {
        const parseSecs = (str: string) => {
          if (!str) return null;
          const trimmed = str.trim();
          if (!trimmed) return null;
          if (!trimmed.includes(":")) {
            const num = parseFloat(trimmed);
            return isNaN(num) || num < 0 ? null : num;
          }
          const p = trimmed.split(":").map(Number);
          if (p.some(isNaN)) return null;
          if (p.length === 2) return p[0] * 60 + p[1];
          if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
          return null;
        };

        const s = parseSecs(startTs);
        const e = parseSecs(endTs);

        if (s === null || e === null) {
          setErrorMsg("Please enter both Start and End timestamps (e.g. 0:15 and 1:45).");
          setRunning(false);
          return;
        }
        if (e <= s) {
          setErrorMsg(`End timestamp (${endTs}) must be greater than Start timestamp (${startTs}).`);
          setRunning(false);
          return;
        }

        customRange = [s, e];
        calculatedTargetDuration = Math.max(1, Math.round(e - s));
      }

      // 1. Trigger process
      const startRes = await fetch("http://127.0.0.1:8000/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: activeUrl,
          num_clips: durationMode === "custom" ? 1 : (parseInt(numClips.toString()) || 1),
          target_duration: calculatedTargetDuration,
          custom_range: customRange,
          topic: topicPrompt || null,
          quality,
          layout,
          camera_style: cameraStyle,
          add_captions: addCaptions,
          caption_style: selectedEffectId,
          caption_y_pct: captionYPct / 100.0,
          add_bg_music: addBgMusic,
          bg_music_vol: bgMusicVol,
          bg_music_file: bgMusicFile || null,
          gameplay_bg_video: gameplayBgVideo || null,
          auto_sfx: autoSfx,
          yt_bypass: avoidCopyright,
          custom_folder_name: customFolderName || null,
          custom_file_name: exportFileName || null,
          output_dir: customOutputDir || null,
          transcription_language: transcriptionLanguage,
          api_key: isCloudEngine ? (activeEngineKey || null) : null,
          ai_engine: selectedEngine,
          custom_crop_boxes: layout === "custom_split" ? [
            { x: (cropTop.x / 456) * 100, y: (cropTop.y / 256) * 100, width: (cropTop.width / 456) * 100, height: (cropTop.height / 256) * 100 },
            { x: (cropBottom.x / 456) * 100, y: (cropBottom.y / 256) * 100, width: (cropBottom.width / 456) * 100, height: (cropBottom.height / 256) * 100 }
          ] : null,
        }),
      });

      if (!startRes.ok) {
        let errMsg = "Failed to start clipping task.";
        try {
          const errData = await startRes.json();
          errMsg = errData.detail || errData.message || errMsg;
        } catch {
          try {
            const errText = await startRes.text();
            errMsg = errText || errMsg;
          } catch {}
        }
        throw new Error(errMsg);
      }

      const { task_id } = await startRes.json();
      currentTaskIdRef.current = task_id;

      // 2. Poll progress
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch(`http://127.0.0.1:8000/api/progress/${task_id}`);
          if (pollRes.ok) {
            const data = await pollRes.json();
            if (data.status) setStatusText(data.status);
            if (typeof data.progress === "number") setProgress(data.progress);

            if (data.completed) {
              if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
              setRunning(false);
              setDone(true);
              setGeneratedClips(data.clips || []);
              if (data.output_dir) setLastOutputFolder(data.output_dir);
              loadVaultClips();
              setViewMode("gallery");
            } else if (data.cancelled) {
              if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
              setRunning(false);
              setStatusText("Processing stopped by user.");
              setProgress(0);
              loadVaultClips();
            } else if (data.error) {
              if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
              setRunning(false);
              const errLower = (data.error || "").toLowerCase();
              if (data.is_rate_limit || errLower.includes("limit") || errLower.includes("quota") || errLower.includes("429")) {
                setShowRateLimitModal(true);
              }
              setErrorMsg(data.error);
            }
          }
        } catch {
          // ignore transient poll error
        }
      }, 1000);
    } catch (err: any) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      setRunning(false);
      const msg = err.message || "An unexpected error occurred.";
      const msgLower = msg.toLowerCase();
      if (msgLower.includes("limit") || msgLower.includes("quota") || msgLower.includes("429")) {
        setShowRateLimitModal(true);
      }
      setErrorMsg(msg);
    }
  };

  const cancelClipper = async () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    const taskId = currentTaskIdRef.current;
    try {
      await fetch(`http://127.0.0.1:8000/api/cancel/${taskId || ""}`, { method: "POST" });
    } catch (err) {
      console.error("Failed to cancel clipping task:", err);
    }
    setRunning(false);
    setStatusText("Processing cancelled by user.");
    setProgress(0);
    loadVaultClips();
  };

  const openOutputFolder = async (specificFolder?: string) => {
    try {
      let target = specificFolder || lastOutputFolder || customOutputDir || "";
      if (target === "all" || target === "Main Library" || target === "root") {
        target = lastOutputFolder || "";
      }
      if (target && !target.includes(":") && !target.startsWith("/") && lastOutputFolder) {
        target = `${lastOutputFolder}/${target}`;
      }
      let electronOpened = false;
      if ((window as any).electronAPI?.openPath) {
        electronOpened = await (window as any).electronAPI.openPath(target);
      }
      if (!electronOpened) {
        await fetch("http://127.0.0.1:8000/api/open_folder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folder_path: target }),
        });
      }
      setExportNotice("Opened folder in Explorer!");
      setTimeout(() => setExportNotice(""), 3000);
    } catch (err) {
      console.error("Failed to open output folder:", err);
    }
  };

  const chooseCustomDirectory = async () => {
    try {
      if ((window as any).electronAPI?.selectDirectory) {
        const selected = await (window as any).electronAPI.selectDirectory(customOutputDir);
        if (selected) {
          setCustomOutputDir(selected);
          setLastOutputFolder(selected);
          try {
            localStorage.setItem("clipvault_custom_output_dir", selected);
          } catch {}
          loadVaultClips();
        }
      }
    } catch (err) {
      console.error("Failed to select directory:", err);
    }
  };

  const deleteVaultClip = async (filePath: string) => {
    if (!filePath) return;
    const cleanName = filePath.split(/[/\\]/).pop() || filePath;
    // Optimistically remove from both vaultClips and generatedClips immediately
    setVaultClips((prev) =>
      prev.filter((c) => {
        if (!c) return false;
        const cPath = String(c.path || "");
        const cName = String(c.filename || "");
        return cPath !== filePath && cName !== cleanName && (!cleanName || !cPath.endsWith(cleanName));
      })
    );
    setGeneratedClips((prev) =>
      prev.filter((c) => {
        if (!c) return false;
        const p = typeof c === "object" ? String(c.path || c.url || "") : String(c || "");
        return p !== filePath && (!cleanName || !p.endsWith(cleanName));
      })
    );
    setSelectedClipPaths((prev) => prev.filter((p) => p !== filePath));
    setPreviewVaultClip((cur) => {
      if (!cur) return null;
      const curPath = String(cur.path || "");
      const curName = String(cur.filename || "");
      return (curPath === filePath || curName === cleanName || (cleanName && curPath.endsWith(cleanName))) ? null : cur;
    });

    try {
      const res = await fetch("http://127.0.0.1:8000/api/delete_clip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: filePath, file_path: filePath, filename: cleanName }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        setExportNotice("Clip deleted permanently!");
        setTimeout(() => setExportNotice(""), 3000);
        loadVaultClips(true); // Silent sync
      }
    } catch (err) {
      console.error("Failed to delete clip:", err);
    }
  };

  const deleteVaultClips = async (filePaths: string[]) => {
    if (!filePaths || filePaths.length === 0) return;
    const names = filePaths.map((fp) => fp.split(/[/\\]/).pop() || fp);
    setVaultClips((prev) =>
      prev.filter((c) => {
        if (!c) return false;
        const cPath = String(c.path || "");
        const cName = String(c.filename || "");
        return !filePaths.includes(cPath) && !names.includes(cName);
      })
    );
    setGeneratedClips((prev) =>
      prev.filter((c) => {
        if (!c) return false;
        const p = typeof c === "object" ? String(c.path || c.url || "") : String(c || "");
        return !filePaths.includes(p);
      })
    );
    setSelectedClipPaths([]);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/delete_clip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths: filePaths }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        setExportNotice(`${filePaths.length} clip(s) deleted permanently!`);
        setTimeout(() => setExportNotice(""), 3000);
        loadVaultClips(true); // Silent sync
      }
    } catch (err) {
      console.error("Failed to batch delete clips:", err);
    }
  };

  const handleMoveClips = async (clipPaths: string[], targetFolder: string) => {
    if (!clipPaths || clipPaths.length === 0) return;
    const cleanTarget = targetFolder === "all" || targetFolder === "root" ? "Main Library" : targetFolder;
    const names = clipPaths.map((p) => p.split(/[/\\]/).pop() || p);

    // Optimistically update clip folder so it instantly leaves the source directory view
    setVaultClips((prev) =>
      prev.map((c) => {
        if (!c) return c;
        const cPath = String(c.path || "");
        const cName = String(c.filename || "");
        if (clipPaths.includes(cPath) || names.includes(cName)) {
          return { ...c, folder: cleanTarget };
        }
        return c;
      })
    );

    try {
      const res = await fetch("http://127.0.0.1:8000/api/move_clips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clip_paths: clipPaths, target_folder: cleanTarget }),
      });
      if (res.ok) {
        setMoveModalClips(null);
        setSelectedClipPaths([]);
        setExportNotice(`✓ Moved ${clipPaths.length} clip(s) to "${cleanTarget}"`);
        setTimeout(() => setExportNotice(""), 3500);
        loadVaultClips(true); // Silent sync
      }
    } catch (err) {
      console.error("Failed to move clips:", err);
    }
  };

  const openNewSubfolderModal = (parentFolder: string = "root") => {
    setNewFolderParent(parentFolder);
    setNewFolderNameInput("");
    setShowNewFolderModal(true);
  };

  const handleDeleteFolder = async (folderName: string) => {
    if (!folderName || folderName === "all" || folderName === "Main Library") return;
    if (
      !window.confirm(
        `Are you sure you want to delete folder "${folderName}"?\nAny video clips inside will remain safe in Main Library.`
      )
    ) {
      return;
    }
    setVaultFolders((prev) => prev.filter((f) => f !== folderName && !f.startsWith(`${folderName}/`)));
    if (vaultSelectedFolder === folderName || vaultSelectedFolder.startsWith(`${folderName}/`)) {
      setVaultSelectedFolder("all");
    }
    try {
      const res = await fetch("http://127.0.0.1:8000/api/delete_folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder_name: folderName }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        setExportNotice(`Folder "${folderName}" deleted.`);
        setTimeout(() => setExportNotice(""), 3000);
        loadVaultClips(true);
      }
    } catch (err) {
      console.error("Failed to delete folder:", err);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderNameInput.trim()) return;
    try {
      const res = await fetch("http://127.0.0.1:8000/api/create_folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folder_name: newFolderNameInput.trim(),
          parent_folder: newFolderParent !== "root" ? newFolderParent : "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        setShowNewFolderModal(false);
        const createdName = data.folder_name || data.folder || newFolderNameInput.trim();
        setVaultFolders((prev) => Array.from(new Set([...prev, createdName])));
        setVaultSelectedFolder(createdName);
        setNewFolderNameInput("");
        setNewFolderParent("root");
        setExportNotice(`Folder "${createdName}" created successfully!`);
        setTimeout(() => setExportNotice(""), 3000);
        loadVaultClips(true);
      }
    } catch (err) {
      console.error("Failed to create folder:", err);
    }
  };

  const handleRenameFolder = async (oldFolder: string, newName: string) => {
    if (!oldFolder || !newName.trim()) return;
    try {
      const res = await fetch("http://127.0.0.1:8000/api/rename_folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ old_folder: oldFolder, new_name: newName.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        setExportNotice(`Renamed folder to "${data.new_folder}".`);
        setTimeout(() => setExportNotice(""), 3000);
        if (vaultSelectedFolder === oldFolder) {
          setVaultSelectedFolder(data.new_folder);
        }
        loadVaultClips(true);
      } else {
        alert(data.error || "Failed to rename folder");
      }
    } catch (err) {
      console.error("Failed to rename folder:", err);
    }
  };

  const handleImportClips = async (files: FileList, targetFolder: string) => {
    if (!files || files.length === 0) return;
    let count = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.name.match(/\.(mp4|mov|webm|mkv)$/i)) continue;
      const formData = new FormData();
      formData.append("file", file);
      formData.append("target_folder", targetFolder || "Main Library");
      try {
        const res = await fetch("http://127.0.0.1:8000/api/import_clip", {
          method: "POST",
          body: formData,
        });
        if (res.ok) count++;
      } catch (err) {
        console.error("Failed to import file:", err);
      }
    }
    if (count > 0) {
      setExportNotice(`Imported ${count} video(s) into ${targetFolder || "Main Library"}!`);
      setTimeout(() => setExportNotice(""), 3000);
      loadVaultClips(true);
    }
  };

  const handleDuplicateClip = async (filePath: string) => {
    if (!filePath) return;
    try {
      const res = await fetch("http://127.0.0.1:8000/api/duplicate_clip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_path: filePath, path: filePath }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        setExportNotice(`Duplicated "${data.filename}" successfully!`);
        setTimeout(() => setExportNotice(""), 3000);
        loadVaultClips(true);
      } else {
        alert(data.error || "Failed to duplicate clip");
      }
    } catch (err) {
      console.error("Failed to duplicate clip:", err);
    }
  };

  const handleSortGeneratedClips = async () => {
    setIsSortingGallery(true);
    try {
      const checkedPaths = gallerySelectedClips.map((i) => generatedClips[i]?.path || generatedClips[i]).filter(Boolean);
      const uncheckPaths = generatedClips
        .filter((_, i) => !gallerySelectedClips.includes(i))
        .map((c) => c?.path || c)
        .filter(Boolean);

      const targetPrimary = galleryTargetFolder.trim() || customFolderName.trim() || "Highlights";
      const targetRandom = galleryRandomFolder.trim() || "Random & Unsorted";

      if (checkedPaths.length > 0) {
        await handleMoveClips(checkedPaths, targetPrimary);
      }
      if (uncheckPaths.length > 0) {
        await handleMoveClips(uncheckPaths, targetRandom);
      }
      setExportNotice(`Clips organized into "${targetPrimary}" and "${targetRandom}"!`);
      setTimeout(() => setExportNotice(""), 5000);
      loadVaultClips();
    } catch (err) {
      console.error("Failed to sort gallery:", err);
    } finally {
      setIsSortingGallery(false);
    }
  };

  // Caption Drag Handler
  const startCaptionDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingCaption(true);
    const startY = e.clientY;
    const startPct = captionYPct;

    const onMouseMove = (moveEvt: MouseEvent) => {
      const deltaY = moveEvt.clientY - startY;
      const newPct = Math.max(10, Math.min(90, Math.round(startPct + deltaY / 5.5)));
      setCaptionYPct(newPct);
    };

    const onMouseUp = () => {
      setIsDraggingCaption(false);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  return (
    <div className="h-screen w-screen flex flex-col font-['Inter',sans-serif] overflow-hidden bg-[#050505] select-none">
      {/* Background Glow */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: "radial-gradient(ellipse 50% 40% at 50% 0%, rgba(251,191,36,0.07) 0%, transparent 70%)",
        }}
      />

      {/* Header Bar */}
      <header className="relative z-10 flex items-center justify-between px-8 pt-7 h-20 pr-36 flex-shrink-0 border-b border-white/5 bg-[#050505]/90 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="w-px h-5 bg-white/10" />
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center bg-gradient-to-r from-amber-400 to-amber-500 shadow-[0_0_15px_rgba(251,191,36,0.4)]">
              <Zap className="w-3.5 h-3.5 text-black" strokeWidth={2.5} />
            </div>
            <span className="text-white font-bold text-base">ClipVault Studio</span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/25 tracking-wide">
              V1
            </span>
          </div>

          {/* View Mode Tabs */}
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
                setViewMode("vault");
                loadVaultClips(false);
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

        {/* AI Engine Badge & BYOK Toggle */}
        <div className="flex items-center gap-3">
          {done && (
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00e676] text-black font-bold text-xs hover:brightness-110 transition-all cursor-pointer shadow-[0_0_20px_rgba(0,230,118,0.3)]">
              <Download className="w-4 h-4" strokeWidth={2.5} />
              Export {quality.toUpperCase()}
            </button>
          )}
          <button
            id="tour-step-3-engine"
            type="button"
            onClick={() => setShowKeySettings(!showKeySettings)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs text-white transition-all cursor-pointer shadow-md ${
              isKeyMissingForActiveEngine
                ? "bg-amber-500/15 border-amber-400 hover:bg-amber-500/25 shadow-amber-400/10"
                : "bg-white/5 hover:bg-white/10 border-amber-400/30"
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-bold text-gray-300">Engine:</span>
            <span className="text-amber-400 font-bold">
              {(AI_ENGINES.find((e) => e.id === selectedEngine) || AI_ENGINES[0])?.name || "AI Engine"}
            </span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-extrabold uppercase ${
              byokMode === "local" 
                ? "bg-white/10 text-gray-300 border border-white/20"
                : isKeyMissingForActiveEngine
                ? "bg-amber-400/20 text-amber-300 border border-amber-400/40 animate-pulse"
                : "bg-amber-400 text-black shadow-sm"
            }`}>
              {byokMode === "local" ? "Local GPU / QSV" : isKeyMissingForActiveEngine ? "Key Missing (API)" : "Cloud AI (API)"}
            </span>
          </button>
        </div>
      </header>

      {/* BYOK Settings Modal */}
      <EngineSettingsModal
        isOpen={showKeySettings}
        onClose={() => setShowKeySettings(false)}
        engines={AI_ENGINES}
        selectedEngine={selectedEngine}
        onSelectEngine={setSelectedEngine}
        byokMode={byokMode}
        setByokMode={setByokMode}
        anthropicKey={anthropicKey}
        setAnthropicKey={setAnthropicKey}
        higgsfieldKey={higgsfieldKey}
        setHiggsfieldKey={setHiggsfieldKey}
        seeDanceKey={seeDanceKey}
        setSeeDanceKey={setSeeDanceKey}
        openAiKey={openAiKey}
        setOpenAiKey={setOpenAiKey}
        geminiKey={geminiKey}
        setGeminiKey={setGeminiKey}
        groqKey={groqKey}
        setGroqKey={setGroqKey}
        deepseekKey={deepseekKey}
        setDeepseekKey={setDeepseekKey}
        moonlightKey={moonlightKey}
        setMoonlightKey={setMoonlightKey}
        qwenKey={qwenKey}
        setQwenKey={setQwenKey}
        customBaseUrl={customBaseUrl}
        setCustomBaseUrl={setCustomBaseUrl}
      />

      {/* Clean API Key Limit Security Modal */}
      {showRateLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-[480px] rounded-3xl bg-[#0d0d0f] border border-amber-400/30 shadow-[0_0_50px_rgba(251,191,36,0.15)] overflow-hidden p-6 space-y-4 text-left">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-400/10 border border-amber-400/20 text-amber-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">
                  API Key Rate Limit Reached
                </h3>
                <p className="text-[11px] text-gray-400">
                  Protected AI Provider Quota Notification
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1.5 text-xs text-gray-300 leading-relaxed">
              <p className="font-semibold text-amber-300">
                Oh no! Your API key is at its limit already.
              </p>
              <p className="text-[11px] text-gray-400">
                Your source code, system environment, and private credentials remain completely secure and hidden. You can immediately switch to your computer&apos;s free on-device hardware or update your API key in settings.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setByokMode("local");
                  setSelectedEngine("intel_ai");
                  setShowRateLimitModal(false);
                  setErrorMsg(null);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-400 text-black font-bold text-xs hover:bg-amber-300 transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
              >
                <HardDrive className="w-4 h-4" />
                <span>Switch to Free Local GPU / NPU Mode</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowRateLimitModal(false);
                  setShowKeySettings(true);
                }}
                className="w-full py-2 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-all cursor-pointer border border-white/10 flex items-center justify-center gap-2"
              >
                <Cpu className="w-3.5 h-3.5 text-amber-400" />
                <span>Update API Key in Settings</span>
              </button>

              <button
                type="button"
                onClick={() => setShowRateLimitModal(false)}
                className="w-full py-1.5 text-center text-xs text-gray-500 hover:text-gray-300 transition-all cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main View Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {viewMode === "setup" && (
          <>
            {cropModalOpen !== "none" ? (
              <div className="w-[520px] flex-shrink-0 border-r border-white/5 overflow-y-auto px-8 py-6 bg-[#070707] flex flex-col">
                <CropEditorModal
                  isOpen={cropModalOpen !== "none"}
                  onClose={() => setCropModalOpen("none")}
                  activeVideoUrl={activeVideoUrl}
                  ytUrl={ytUrl}
                  cropTop={cropTop}
                  setCropTop={setCropTop}
                  cropBottom={cropBottom}
                  setCropBottom={setCropBottom}
                  startTs={startTs}
                  setStartTs={setStartTs}
                  endTs={endTs}
                  setEndTs={setEndTs}
                />
              </div>
            ) : (
              <SetupSidebar
                inputType={inputType}
                setInputType={setInputType}
                ytUrl={ytUrl}
                setYtUrl={setYtUrl}
                localFilePath={localFilePath}
                setLocalFilePath={setLocalFilePath}
                setActiveVideoUrl={setActiveVideoUrl}
                quality={quality}
                setQuality={setQuality}
                layout={layout}
                setLayout={setLayout}
                setCropModalOpen={setCropModalOpen}
                cameraStyle={cameraStyle}
                setCameraStyle={setCameraStyle}
                durationMode={durationMode}
                setDurationMode={setDurationMode}
                numClips={numClips}
                setNumClips={setNumClips}
                targetDuration={targetDuration}
                setTargetDuration={setTargetDuration}
                topicPrompt={topicPrompt}
                setTopicPrompt={setTopicPrompt}
                customOutputDir={customOutputDir}
                setCustomOutputDir={setCustomOutputDir}
                chooseCustomDirectory={chooseCustomDirectory}
                customFolderName={customFolderName}
                setCustomFolderName={setCustomFolderName}
                vaultFolders={vaultFolders}
                exportFileName={exportFileName}
                setExportFileName={setExportFileName}
                transcriptionLanguage={transcriptionLanguage}
                setTranscriptionLanguage={setTranscriptionLanguage}
                autoBroll={autoBroll}
                setAutoBroll={setAutoBroll}
                addBgMusic={addBgMusic}
                setAddBgMusic={setAddBgMusic}
                bgMusicVol={bgMusicVol}
                setBgMusicVol={setBgMusicVol}
                autoSfx={autoSfx}
                setAutoSfx={setAutoSfx}
                addCaptions={addCaptions}
                setAddCaptions={setAddCaptions}
                captionYPct={captionYPct}
                setCaptionYPct={setCaptionYPct}
                selectedEffectId={selectedEffectId}
                setSelectedEffectId={setSelectedEffectId}
                avoidCopyright={avoidCopyright}
                setAvoidCopyright={setAvoidCopyright}
                startTs={startTs}
                setStartTs={setStartTs}
                endTs={endTs}
                setEndTs={setEndTs}
                running={running}
                statusText={statusText}
                progress={progress}
                runClipper={runClipper}
                done={done}
                errorMsg={errorMsg}
                generatedClips={generatedClips}
                setViewMode={setViewMode}
                onCancel={cancelClipper}
                gameplayBgVideo={gameplayBgVideo}
                setGameplayBgVideo={setGameplayBgVideo}
                backgroundVideos={backgroundVideos}
                onUploadBackgroundVideo={handleUploadBackgroundVideo}
                bgMusicFile={bgMusicFile}
                setBgMusicFile={setBgMusicFile}
                backgroundTracks={backgroundTracks}
                onUploadBackgroundMusic={handleUploadBackgroundMusic}
                isKeyMissingForActiveEngine={isKeyMissingForActiveEngine}
                activeEngineName={activeEngineName}
                onOpenEngineSettings={() => setShowKeySettings(true)}
              />
            )}

            <PhonePreview
              activeVideoUrl={activeVideoUrl}
              ytUrl={ytUrl}
              loadingPreview={loadingPreview}
              isProcessing={running}
              progress={progress}
              layout={layout}
              isMuted={isMuted}
              setIsMuted={setIsMuted}
              videoRef={videoRef}
              addCaptions={addCaptions}
              captionYPct={captionYPct}
              isDraggingCaption={isDraggingCaption}
              startCaptionDrag={startCaptionDrag}
              selectedEffectId={selectedEffectId}
              cropTop={cropTop}
              cropBottom={cropBottom}
              startTs={startTs}
              setStartTs={setStartTs}
              endTs={endTs}
              setEndTs={setEndTs}
              onCancel={cancelClipper}
              gameplayBgVideo={gameplayBgVideo}
            />
          </>
        )}

        {viewMode === "gallery" && (
          <GalleryView
            generatedClips={generatedClips}
            onBackToEditor={() => setViewMode("setup")}
            openOutputFolder={openOutputFolder}
            lastOutputFolder={lastOutputFolder}
            exportNotice={exportNotice}
            setExportNotice={setExportNotice}
            gallerySelectedClips={gallerySelectedClips}
            setGallerySelectedClips={setGallerySelectedClips}
            galleryTargetFolder={galleryTargetFolder}
            setGalleryTargetFolder={setGalleryTargetFolder}
            galleryRandomFolder={galleryRandomFolder}
            setGalleryRandomFolder={setGalleryRandomFolder}
            customFolderName={customFolderName}
            handleSortGeneratedClips={handleSortGeneratedClips}
            isSortingGallery={isSortingGallery}
            onSelectClip={(idx) => {
              setActiveClipIndex(idx);
              setViewMode("details");
            }}
            onDeleteClip={(path, idx) => {
              setGeneratedClips((prev) => prev.filter((_, i) => i !== idx));
              if (path) deleteVaultClip(path);
            }}
          />
        )}

        {viewMode === "vault" && (
          <SavedClipsVault
            vaultClips={vaultClips}
            vaultFolders={vaultFolders}
            vaultLoading={vaultLoading}
            vaultSearch={vaultSearch}
            setVaultSearch={setVaultSearch}
            vaultSelectedFolder={vaultSelectedFolder}
            setVaultSelectedFolder={setVaultSelectedFolder}
            selectedClipPaths={selectedClipPaths}
            setSelectedClipPaths={setSelectedClipPaths}
            draggedClipPath={draggedClipPath}
            setDraggedClipPath={setDraggedClipPath}
            onDropOnFolder={(e, folder) => {
              e.preventDefault();
              const rawData = e.dataTransfer.getData("text/plain") || draggedClipPath;
              if (!rawData) return;
              try {
                const parsed = JSON.parse(rawData);
                if (Array.isArray(parsed)) {
                  handleMoveClips(parsed, folder);
                  setSelectedClipPaths([]);
                  return;
                }
              } catch {}
              if (selectedClipPaths.includes(rawData) && selectedClipPaths.length > 1) {
                handleMoveClips(selectedClipPaths, folder);
                setSelectedClipPaths([]);
              } else {
                handleMoveClips([rawData], folder);
              }
            }}
            setShowNewFolderModal={setShowNewFolderModal}
            openOutputFolder={openOutputFolder}
            chooseCustomDirectory={chooseCustomDirectory}
            customOutputDir={customOutputDir}
            lastOutputFolder={lastOutputFolder}
            exportNotice={exportNotice}
            setExportNotice={setExportNotice}
            setMoveModalClips={setMoveModalClips}
            deleteVaultClip={deleteVaultClip}
            deleteVaultClips={deleteVaultClips}
            deleteFolder={handleDeleteFolder}
            openNewSubfolderModal={openNewSubfolderModal}
            onRenameFolder={handleRenameFolder}
            onImportClips={handleImportClips}
            onDuplicateClip={handleDuplicateClip}
            setPreviewVaultClip={setPreviewVaultClip}
            onBackToEditor={() => setViewMode("setup")}
            onStartVaultTour={onStartVaultTour}
            onRefresh={() => loadVaultClips(false)}
          />
        )}

        {viewMode === "details" && generatedClips[activeClipIndex] && (
          <ClipDetailsModal
            clip={
              typeof generatedClips[activeClipIndex] === "object"
                ? generatedClips[activeClipIndex]
                : {
                    filename: `clip_${activeClipIndex + 1}.mp4`,
                    path: generatedClips[activeClipIndex],
                    url: generatedClips[activeClipIndex],
                    title: `Viral Clip ${activeClipIndex + 1}`,
                    description: "High-engagement short video generated with ClipVault.",
                    virality_score: 98,
                    created_at: Date.now(),
                    size_mb: 12,
                    folder: customFolderName || "Main Library",
                  }
            }
            onClose={() => setViewMode("gallery")}
          />
        )}
      </div>

      {/* Vault Preview Modal */}
      {previewVaultClip && (
        <ClipDetailsModal
          clip={previewVaultClip}
          onClose={() => setPreviewVaultClip(null)}
          onDelete={deleteVaultClip}
          onMove={(path) => setMoveModalClips([path])}
        />
      )}

      {/* Move Clips Folder Modal */}
      {moveModalClips && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setMoveModalClips(null)}
        >
          <div
            className="bg-[#141414] border border-amber-400/30 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <Folder className="w-5 h-5 text-amber-400" /> Move {moveModalClips.length} Clip(s) To:
              </h3>
              <button onClick={() => setMoveModalClips(null)} className="text-gray-400 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>
            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
              {vaultFolders.map((folder) => (
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
                className="text-xs text-amber-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Create new folder first
              </button>
              <button
                onClick={() => setMoveModalClips(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setShowNewFolderModal(false)}
        >
          <div
            className="bg-[#141414] border border-amber-400/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold text-base flex items-center gap-2">
                <Folder className="w-5 h-5 text-amber-400" />{" "}
                {newFolderParent && newFolderParent !== "root"
                  ? `New Subfolder in "${newFolderParent}"`
                  : "Create New Folder"}
              </h3>
              <button onClick={() => setShowNewFolderModal(false)} className="text-gray-400 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-400 mb-1 block">Folder Location:</label>
              <select
                value={newFolderParent}
                onChange={(e) => setNewFolderParent(e.target.value)}
                className="w-full rounded-xl px-4 py-2.5 text-xs text-white bg-black/60 border border-white/15 outline-none focus:border-amber-400 cursor-pointer"
              >
                <option value="root">📁 Root / Top Level</option>
                {vaultFolders.map((f) => (
                  <option key={f} value={f}>
                    ↳ 📁 Inside: {f}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-400 mb-1 block">Folder Name:</label>
              <input
                ref={newFolderInputRef}
                type="text"
                autoFocus
                value={newFolderNameInput}
                onChange={(e) => setNewFolderNameInput(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter") handleCreateFolder();
                }}
                placeholder="e.g. Day 1, Stream Highlights, Shorts..."
                className="w-full rounded-xl px-4 py-2.5 text-xs text-white bg-black/60 border border-white/20 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 cursor-text select-text pointer-events-auto shadow-inner"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowNewFolderModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                className="px-5 py-2 rounded-xl text-xs font-black bg-amber-400 text-black hover:bg-amber-300 transition-all shadow-md cursor-pointer"
              >
                Create Folder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
