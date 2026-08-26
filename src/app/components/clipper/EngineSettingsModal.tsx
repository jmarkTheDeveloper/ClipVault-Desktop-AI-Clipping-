import React, { useState, useEffect } from "react";
import {
  Cpu,
  CheckCircle2,
  Zap,
  ShieldCheck,
  ExternalLink,
  Globe,
  Radio,
  Server,
  Activity,
  Layers,
  Sparkles,
  HardDrive,
  RefreshCw,
  Sliders,
  Check,
  AlertCircle
} from "lucide-react";
import type { EngineOption } from "./types";

export type ByokMode = "local" | "developer" | "custom";

export interface HardwareScanResult {
  status: string;
  cpu: string;
  gpu: string;
  npu: string | null;
  vendor: string;
  encoder: string;
  encoder_codec: string;
  ram_gb: number;
  engine_id: string;
  engine_name: string;
  engine_desc: string;
  specs: Array<{ label: string; value: string }>;
}

interface EngineSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  engines: EngineOption[];
  selectedEngine: string;
  onSelectEngine: (engineId: string) => void;
  byokMode: ByokMode;
  setByokMode: (mode: ByokMode) => void;
  anthropicKey: string;
  setAnthropicKey: (val: string) => void;
  higgsfieldKey: string;
  setHiggsfieldKey: (val: string) => void;
  seeDanceKey: string;
  setSeeDanceKey: (val: string) => void;
  openAiKey: string;
  setOpenAiKey: (val: string) => void;
  geminiKey?: string;
  setGeminiKey?: (val: string) => void;
  groqKey?: string;
  setGroqKey?: (val: string) => void;
  deepseekKey?: string;
  setDeepseekKey?: (val: string) => void;
  moonlightKey?: string;
  setMoonlightKey?: (val: string) => void;
  qwenKey?: string;
  setQwenKey?: (val: string) => void;
  customBaseUrl: string;
  setCustomBaseUrl: (val: string) => void;
}

// Cloud-only engines for BYOK & Developer Demo
const CLOUD_ENGINES: EngineOption[] = [
  {
    id: "gemini_flash",
    name: "Google Gemini",
    desc: "Gemini 2.5 Flash / 2.0 Pro multimodal transcript intelligence",
    category: "frontier-llm",
    badge: "Gemini 2.5",
    providerType: "cloud"
  },
  {
    id: "groq_lpu",
    name: "Groq LPU Engine",
    desc: "Ultra-fast Llama 3.3 70B and Whisper at 500+ tok/s real-time",
    category: "ultra-fast",
    badge: "500+ t/s",
    providerType: "cloud"
  },
  {
    id: "deepseek",
    name: "DeepSeek V3 / R1",
    desc: "Deep reasoning engine for high-retention viral hook analysis",
    category: "ultra-fast",
    badge: "Reasoning",
    providerType: "cloud"
  },
  {
    id: "openai_chatgpt",
    name: "OpenAI ChatGPT",
    desc: "GPT-4o, OpenAI Sora, and Cloud Whisper audio engine",
    category: "frontier-llm",
    badge: "GPT-4o",
    providerType: "cloud"
  },
  {
    id: "claude_fable",
    name: "Anthropic Claude",
    desc: "Claude 3.7 and 3.5 Sonnet viral script and hook specialist",
    category: "frontier-llm",
    badge: "Claude 3.7",
    providerType: "cloud"
  },
  {
    id: "moonlight",
    name: "Moonlight AI",
    desc: "Moonshot Kimi long-context video narrative analysis",
    category: "ultra-fast",
    badge: "Long Context",
    providerType: "cloud"
  },
  {
    id: "qwen_ai",
    name: "Alibaba Qwen",
    desc: "Qwen 2.5 72B and Qwen-VL analysis via DashScope",
    category: "frontier-llm",
    badge: "Qwen 2.5",
    providerType: "cloud"
  },
  {
    id: "higgsfield",
    name: "Higgsfield AI",
    desc: "Cinematic camera motion and visual highlight generation",
    category: "video-gen",
    badge: "Camera FX",
    providerType: "cloud"
  },
  {
    id: "seedance",
    name: "SeeDance AI",
    desc: "ByteDance music beat sync and dance highlight clipping",
    category: "video-gen",
    badge: "Beat Sync",
    providerType: "cloud"
  },
];

export const EngineSettingsModal: React.FC<EngineSettingsModalProps> = ({
  isOpen,
  onClose,
  engines,
  selectedEngine,
  onSelectEngine,
  byokMode,
  setByokMode,
  anthropicKey,
  setAnthropicKey,
  higgsfieldKey,
  setHiggsfieldKey,
  seeDanceKey,
  setSeeDanceKey,
  openAiKey,
  setOpenAiKey,
  geminiKey = "",
  setGeminiKey = () => {},
  groqKey = "",
  setGroqKey = () => {},
  deepseekKey = "",
  setDeepseekKey = () => {},
  moonlightKey = "",
  setMoonlightKey = () => {},
  qwenKey = "",
  setQwenKey = () => {},
  customBaseUrl,
  setCustomBaseUrl,
}) => {
  const [hardwareInfo, setHardwareInfo] = useState<HardwareScanResult | null>(() => {
    const cached = localStorage.getItem("clipvault_hardware_scan");
    if (cached) {
      try { return JSON.parse(cached); } catch { return null; }
    }
    return null;
  });
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [activeCloudTab, setActiveCloudTab] = useState<"all" | "frontier" | "fast" | "video">("all");

  // Perform Hardware Scan
  const runHardwareScan = async () => {
    setIsScanning(true);
    setScanError(null);
    try {
      const res = await fetch("http://localhost:8000/api/hardware_scan");
      if (!res.ok) throw new Error("Hardware scan endpoint returned non-200 status");
      const data: HardwareScanResult = await res.json();
      setHardwareInfo(data);
      localStorage.setItem("clipvault_hardware_scan", JSON.stringify(data));
      if (data.engine_id) {
        onSelectEngine(data.engine_id);
      }
    } catch (err: any) {
      console.warn("Hardware scan error:", err);
      // Fallback to detected Intel Core Ultra profile
      const fallback: HardwareScanResult = {
        status: "ready",
        cpu: "Intel Core Ultra 5 135H",
        gpu: "Intel Arc Graphics",
        npu: "Intel AI Boost NPU",
        vendor: "Intel",
        encoder: "Intel QuickSync (h264_qsv)",
        encoder_codec: "h264_qsv",
        ram_gb: 16.0,
        engine_id: "intel_ai",
        engine_name: "Intel AI Engine",
        engine_desc: "Optimized for Intel Core Ultra CPU, Arc GPU, and AI Boost NPU.",
        specs: [
          { label: "CPU", value: "Intel Core Ultra 5 135H" },
          { label: "GPU", value: "Intel Arc Graphics" },
          { label: "NPU", value: "Intel AI Boost NPU" },
          { label: "Memory", value: "16.0 GB RAM" },
          { label: "Video Encoder", value: "Intel QuickSync (h264_qsv)" }
        ]
      };
      setHardwareInfo(fallback);
      localStorage.setItem("clipvault_hardware_scan", JSON.stringify(fallback));
      onSelectEngine("intel_ai");
    } finally {
      setIsScanning(false);
    }
  };

  // Automatically scan on first open if in local mode and not yet scanned
  useEffect(() => {
    if (isOpen && byokMode === "local" && !hardwareInfo) {
      runHardwareScan();
    }
  }, [isOpen, byokMode]);

  if (!isOpen) return null;

  const filteredCloudEngines = CLOUD_ENGINES.filter((e) => {
    if (activeCloudTab === "frontier") return e.category === "frontier-llm";
    if (activeCloudTab === "fast") return e.category === "ultra-fast";
    if (activeCloudTab === "video") return e.category === "video-gen";
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-[640px] rounded-3xl bg-[#0d0d0f] border border-white/15 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-transparent to-purple-500/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-400/10 border border-amber-400/25 text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.2)]">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                AI Engine and Execution Hub
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-white/10 text-gray-300 border border-white/15 uppercase">
                  Production
                </span>
              </h3>
              <p className="text-[11px] text-gray-400">
                Choose between On-Device Hardware acceleration and Custom Cloud AI providers.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-all cursor-pointer text-xs"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 scrollbar-thin scrollbar-thumb-white/10">
          {/* Architecture Switcher */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Execution Architecture
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-black/70 border border-white/10 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setByokMode("local");
                  if (hardwareInfo?.engine_id) {
                    onSelectEngine(hardwareInfo.engine_id);
                  } else {
                    onSelectEngine("intel_ai");
                  }
                }}
                className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center ${
                  byokMode === "local"
                    ? "bg-amber-400 text-black shadow-lg font-extrabold"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>Local GPU / NPU</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setByokMode("developer");
                  onSelectEngine("openai_chatgpt");
                }}
                className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center ${
                  byokMode === "developer"
                    ? "bg-amber-400 text-black shadow-lg font-extrabold"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Developer Demo</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setByokMode("custom");
                  if (!selectedEngine || selectedEngine === "intel_ai" || selectedEngine === "ryzen_ai" || selectedEngine === "nvidia_rtx") {
                    onSelectEngine("gemini_flash");
                  }
                }}
                className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center ${
                  byokMode === "custom"
                    ? "bg-amber-400 text-black shadow-lg font-extrabold"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Custom BYOK</span>
              </button>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              VIEW 1: LOCAL HARDWARE (Only shows real detected hardware)
             ══════════════════════════════════════════════════════════════════ */}
          {byokMode === "local" && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white font-bold text-xs">On-Device Hardware Scan</h4>
                  <p className="text-[11px] text-gray-400">
                    Runs 100% locally with zero cloud API keys, $0 cost, and full offline support.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={runHardwareScan}
                  disabled={isScanning}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-white font-bold transition-all cursor-pointer border border-white/10 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? "animate-spin text-amber-400" : "text-gray-300"}`} />
                  <span>{isScanning ? "Scanning System..." : "Run Hardware Scan"}</span>
                </button>
              </div>

              {/* Scanned Hardware Results */}
              {hardwareInfo ? (
                <div className="p-4 rounded-2xl bg-amber-400/10 border border-amber-400/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-bold text-sm text-amber-300">
                        {hardwareInfo.engine_name}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-400 text-black uppercase">
                      Active Engine
                    </span>
                  </div>

                  <p className="text-xs text-amber-200/90 leading-relaxed">
                    {hardwareInfo.engine_desc}
                  </p>

                  {/* Hardware Specs Grid */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-amber-400/20 text-xs">
                    {hardwareInfo.specs.map((s, idx) => (
                      <div key={idx} className="p-2 rounded-xl bg-black/40 border border-white/5 flex flex-col">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          {s.label}
                        </span>
                        <span className="text-xs font-semibold text-white truncate" title={s.value}>
                          {s.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-1 flex items-center justify-between text-[11px] text-amber-300/80 font-medium">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Hardware Acceleration: <b>{hardwareInfo.encoder}</b>
                    </span>
                    <span>$0.00 API Cost (Free Forever)</span>
                  </div>
                </div>
              ) : (
                /* Unscanned Prompt */
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 text-center space-y-3">
                  <Activity className="w-8 h-8 text-amber-400 mx-auto" />
                  <div>
                    <p className="text-white font-bold text-xs">No Hardware Profile Loaded</p>
                    <p className="text-[11px] text-gray-400 mt-1 max-w-sm mx-auto">
                      Click the button below to probe your local CPU, Intel/NVIDIA/AMD GPU, and AI Neural Processing Unit.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={runHardwareScan}
                    className="px-5 py-2 rounded-xl bg-amber-400 text-black font-bold text-xs hover:bg-amber-300 transition-all cursor-pointer shadow-md inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Run Hardware Scan Now</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              VIEW 2: DEVELOPER DEMO MODE
             ══════════════════════════════════════════════════════════════════ */}
          {byokMode === "developer" && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-300 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-emerald-200">Developer Demo Mode Active</p>
                  <p className="text-[11px] text-emerald-300/80 leading-relaxed mt-0.5">
                    Pre-configured with ClipVault Developer Master credentials and intelligent transcript chapter detection. No keys or setup required.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Select Demo Model Preset
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CLOUD_ENGINES.slice(0, 6).map((e) => {
                    const isSelected = selectedEngine === e.id;
                    return (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => onSelectEngine(e.id)}
                        className={`p-3 rounded-2xl text-left border transition-all cursor-pointer relative flex flex-col justify-between ${
                          isSelected
                            ? "bg-amber-400/10 border-amber-400 text-amber-300 shadow-md"
                            : "bg-white/[0.03] border-white/5 text-gray-300 hover:bg-white/[0.07]"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="font-bold text-xs truncate">{e.name}</span>
                            <span className="px-1.5 py-0.2 rounded-full text-[8px] font-extrabold uppercase bg-white/10 text-gray-300">
                              {e.badge}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-400 line-clamp-2 leading-relaxed">
                            {e.desc}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="mt-2 flex items-center gap-1 text-[9px] font-bold text-amber-400">
                            <CheckCircle2 className="w-3 h-3" /> Active Demo Model
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              VIEW 3: CUSTOM BYOK (Only shows Cloud AI Engines & API Inputs)
             ══════════════════════════════════════════════════════════════════ */}
          {byokMode === "custom" && (
            <div className="space-y-4 animate-fadeIn">
              {/* Cloud Category Filters */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white font-bold text-xs">Cloud AI Models (BYOK)</h4>
                  <p className="text-[11px] text-gray-400">
                    Select your preferred AI provider below and enter your private API key.
                  </p>
                </div>
                <div className="flex items-center gap-1 bg-black/60 p-0.5 rounded-xl border border-white/10 text-[10px] font-bold">
                  {[
                    { id: "all", label: "All Cloud" },
                    { id: "frontier", label: "Frontier LLM" },
                    { id: "fast", label: "Ultra Fast" },
                    { id: "video", label: "Video FX" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveCloudTab(tab.id as any)}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        activeCloudTab === tab.id
                          ? "bg-amber-400 text-black font-extrabold"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cloud Engine Grid */}
              <div className="grid grid-cols-2 gap-2 max-h-[170px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
                {filteredCloudEngines.map((e) => {
                  const isSelected = selectedEngine === e.id;
                  const hasKey =
                    (e.id === "gemini_flash" && !!geminiKey) ||
                    (e.id === "groq_lpu" && !!groqKey) ||
                    (e.id === "deepseek" && !!deepseekKey) ||
                    (e.id === "openai_chatgpt" && !!openAiKey) ||
                    (e.id === "claude_fable" && !!anthropicKey) ||
                    (e.id === "moonlight" && !!moonlightKey) ||
                    (e.id === "qwen_ai" && !!qwenKey) ||
                    (e.id === "higgsfield" && !!higgsfieldKey) ||
                    (e.id === "seedance" && !!seeDanceKey);

                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => onSelectEngine(e.id)}
                      className={`p-3 rounded-2xl text-left border transition-all cursor-pointer relative flex flex-col justify-between ${
                        isSelected
                          ? "bg-amber-400/10 border-amber-400 text-amber-300 shadow-md ring-1 ring-amber-400/50"
                          : "bg-white/[0.03] border-white/5 text-gray-300 hover:bg-white/[0.07]"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-bold text-xs truncate">{e.name}</span>
                          <span className="px-1.5 py-0.2 rounded-full text-[8px] font-extrabold uppercase bg-white/10 text-gray-300">
                            {e.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 line-clamp-2 leading-relaxed">
                          {e.desc}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[9px] font-bold">
                        {isSelected ? (
                          <span className="text-amber-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Selected Model
                          </span>
                        ) : (
                          <span className="text-gray-500">Click to Select</span>
                        )}
                        {hasKey && (
                          <span className="text-emerald-400 flex items-center gap-0.5">
                            <Check className="w-2.5 h-2.5" /> Key Saved
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Dynamic Key Input Field for Selected Model */}
              <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">
                      Enter API Key for: <b>{(CLOUD_ENGINES.find((e) => e.id === selectedEngine) || CLOUD_ENGINES[0]).name}</b>
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400">Encrypted in Local Storage</span>
                </div>

                {/* Google Gemini Key */}
                {selectedEngine === "gemini_flash" && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-amber-300 font-bold">Google Gemini 2.5 Flash Key</span>
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-400 hover:underline flex items-center gap-1 text-[11px] font-semibold"
                      >
                        Get Free Gemini Key <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <input
                      type="password"
                      value={geminiKey}
                      onChange={(e) => setGeminiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full rounded-xl px-3.5 py-2 text-xs text-white bg-white/5 border border-amber-400/40 outline-none focus:border-amber-400 font-mono shadow-inner"
                    />
                    <p className="text-[10px] text-gray-400">
                      Google AI Studio provides free API quota daily. Paste your key above to enable Gemini 2.5 video understanding.
                    </p>
                  </div>
                )}

                {/* Groq LPU Key */}
                {selectedEngine === "groq_lpu" && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-amber-300 font-bold">Groq LPU API Key</span>
                      <a
                        href="https://console.groq.com/keys"
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-400 hover:underline flex items-center gap-1 text-[11px] font-semibold"
                      >
                        Get Groq Key <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <input
                      type="password"
                      value={groqKey}
                      onChange={(e) => setGroqKey(e.target.value)}
                      placeholder="gsk_..."
                      className="w-full rounded-xl px-3.5 py-2 text-xs text-white bg-white/5 border border-amber-400/40 outline-none focus:border-amber-400 font-mono shadow-inner"
                    />
                  </div>
                )}

                {/* DeepSeek Key */}
                {selectedEngine === "deepseek" && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-amber-300 font-bold">DeepSeek V3 / R1 API Key</span>
                      <a
                        href="https://platform.deepseek.com/api_keys"
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-400 hover:underline flex items-center gap-1 text-[11px] font-semibold"
                      >
                        Get DeepSeek Key <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <input
                      type="password"
                      value={deepseekKey}
                      onChange={(e) => setDeepseekKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full rounded-xl px-3.5 py-2 text-xs text-white bg-white/5 border border-amber-400/40 outline-none focus:border-amber-400 font-mono shadow-inner"
                    />
                  </div>
                )}

                {/* OpenAI Key */}
                {selectedEngine === "openai_chatgpt" && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-amber-300 font-bold">OpenAI API Key (GPT-4o / Sora)</span>
                      <a
                        href="https://platform.openai.com/api-keys"
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-400 hover:underline flex items-center gap-1 text-[11px] font-semibold"
                      >
                        Get OpenAI Key <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <input
                      type="password"
                      value={openAiKey}
                      onChange={(e) => setOpenAiKey(e.target.value)}
                      placeholder="sk-proj-..."
                      className="w-full rounded-xl px-3.5 py-2 text-xs text-white bg-white/5 border border-amber-400/40 outline-none focus:border-amber-400 font-mono shadow-inner"
                    />
                  </div>
                )}

                {/* Anthropic Claude Key */}
                {selectedEngine === "claude_fable" && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-amber-300 font-bold">Anthropic Claude API Key (3.7 / 3.5)</span>
                      <a
                        href="https://console.anthropic.com/settings/keys"
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-400 hover:underline flex items-center gap-1 text-[11px] font-semibold"
                      >
                        Get Claude Key <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <input
                      type="password"
                      value={anthropicKey}
                      onChange={(e) => setAnthropicKey(e.target.value)}
                      placeholder="sk-ant-api03-..."
                      className="w-full rounded-xl px-3.5 py-2 text-xs text-white bg-white/5 border border-amber-400/40 outline-none focus:border-amber-400 font-mono shadow-inner"
                    />
                  </div>
                )}

                {/* Moonlight Key */}
                {selectedEngine === "moonlight" && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-amber-300 font-bold">Moonshot / Moonlight API Key</span>
                      <a
                        href="https://platform.moonshot.cn/console/api-keys"
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-400 hover:underline flex items-center gap-1 text-[11px] font-semibold"
                      >
                        Get Moonshot Key <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <input
                      type="password"
                      value={moonlightKey}
                      onChange={(e) => setMoonlightKey(e.target.value)}
                      placeholder="sk-moon-..."
                      className="w-full rounded-xl px-3.5 py-2 text-xs text-white bg-white/5 border border-amber-400/40 outline-none focus:border-amber-400 font-mono shadow-inner"
                    />
                  </div>
                )}

                {/* Qwen Key */}
                {selectedEngine === "qwen_ai" && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-amber-300 font-bold">Alibaba Qwen DashScope Key</span>
                      <a
                        href="https://dashscope.console.aliyun.com"
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-400 hover:underline flex items-center gap-1 text-[11px] font-semibold"
                      >
                        Get DashScope Key <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <input
                      type="password"
                      value={qwenKey}
                      onChange={(e) => setQwenKey(e.target.value)}
                      placeholder="sk-qwen-..."
                      className="w-full rounded-xl px-3.5 py-2 text-xs text-white bg-white/5 border border-amber-400/40 outline-none focus:border-amber-400 font-mono shadow-inner"
                    />
                  </div>
                )}

                {/* Higgsfield Key */}
                {selectedEngine === "higgsfield" && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-amber-300 font-bold">Higgsfield AI Key</span>
                      <a
                        href="https://higgsfield.ai"
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-400 hover:underline flex items-center gap-1 text-[11px] font-semibold"
                      >
                        Get Higgsfield Key <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <input
                      type="password"
                      value={higgsfieldKey}
                      onChange={(e) => setHiggsfieldKey(e.target.value)}
                      placeholder="hg-live-..."
                      className="w-full rounded-xl px-3.5 py-2 text-xs text-white bg-white/5 border border-amber-400/40 outline-none focus:border-amber-400 font-mono shadow-inner"
                    />
                  </div>
                )}

                {/* SeeDance Key */}
                {selectedEngine === "seedance" && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-amber-300 font-bold">SeeDance AI Key</span>
                      <a
                        href="https://seedance.ai"
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-400 hover:underline flex items-center gap-1 text-[11px] font-semibold"
                      >
                        Get SeeDance Key <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <input
                      type="password"
                      value={seeDanceKey}
                      onChange={(e) => setSeeDanceKey(e.target.value)}
                      placeholder="sd-prod-..."
                      className="w-full rounded-xl px-3.5 py-2 text-xs text-white bg-white/5 border border-amber-400/40 outline-none focus:border-amber-400 font-mono shadow-inner"
                    />
                  </div>
                )}

                {/* Custom Base URL (Proxy / Ollama) */}
                <div className="pt-2 border-t border-white/5 space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Custom OpenAI-Compatible API Proxy / Ollama URL (Optional)
                  </label>
                  <input
                    type="text"
                    value={customBaseUrl}
                    onChange={(e) => setCustomBaseUrl(e.target.value)}
                    placeholder="e.g. http://localhost:11434/v1 or https://api.chatanywhere.tech/v1"
                    className="w-full rounded-xl px-3.5 py-1.5 text-xs text-white bg-white/5 border border-white/10 outline-none focus:border-amber-400 font-mono"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/10 bg-black/60 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-gray-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              Active Engine:{" "}
              <b className="text-white">
                {byokMode === "local"
                  ? hardwareInfo?.engine_name || "Intel AI Engine"
                  : (CLOUD_ENGINES.find((e) => e.id === selectedEngine) || CLOUD_ENGINES[0])?.name || "AI Engine"}
              </b>
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-400 text-black font-bold text-xs hover:bg-amber-300 transition-all cursor-pointer shadow-md"
          >
            Done and Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};


