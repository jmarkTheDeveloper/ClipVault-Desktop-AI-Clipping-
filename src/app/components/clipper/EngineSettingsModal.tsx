import React, { useState } from "react";
import {
  Cpu,
  CheckCircle2,
  Zap,
  ShieldCheck,
  ExternalLink,
  Sparkles,
  Layers,
  Flame,
  Globe,
  Radio,
  Server
} from "lucide-react";
import type { EngineOption } from "./types";

export type ByokMode = "local" | "developer" | "custom";

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
  const [activeCategory, setActiveCategory] = useState<"all" | "local-hardware" | "ultra-fast" | "frontier-llm" | "video-gen">("all");

  if (!isOpen) return null;

  const filteredEngines = activeCategory === "all"
    ? engines
    : engines.filter((e) => e.category === activeCategory);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-[620px] rounded-3xl bg-[#0d0d0f] border border-white/15 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-transparent to-purple-500/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-400/10 border border-amber-400/25 text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.2)]">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                AI Engine & Hardware Ecosystem
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-gradient-to-r from-amber-400 to-orange-400 text-black">
                  MULTI-TIER
                </span>
              </h3>
              <p className="text-[11px] text-gray-400">
                Switch between Local On-Device NPU/GPU, Ultra-Fast LPUs, and Frontier Cloud AI.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5 scrollbar-thin scrollbar-thumb-white/10">
          {/* Operating Mode Selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Execution Architecture
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-black/70 border border-white/10 text-xs font-bold">
              <button
                type="button"
                onClick={() => setByokMode("local")}
                className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center ${
                  byokMode === "local"
                    ? "bg-gradient-to-r from-amber-400 to-amber-500 text-black shadow-lg font-extrabold"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Local GPU / NPU</span>
              </button>

              <button
                type="button"
                onClick={() => setByokMode("developer")}
                className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center ${
                  byokMode === "developer"
                    ? "bg-gradient-to-r from-amber-400 to-amber-500 text-black shadow-lg font-extrabold"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Developer Demo</span>
              </button>

              <button
                type="button"
                onClick={() => setByokMode("custom")}
                className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center ${
                  byokMode === "custom"
                    ? "bg-gradient-to-r from-amber-400 to-amber-500 text-black shadow-lg font-extrabold"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Custom BYOK</span>
              </button>
            </div>
          </div>

          {/* Mode Explainer Banner */}
          {byokMode === "local" && (
            <div className="p-3.5 rounded-2xl bg-amber-400/10 border border-amber-400/25 text-xs text-amber-300 flex items-start gap-3">
              <Zap className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-200">100% Free On-Device Acceleration Active</p>
                <p className="text-[11px] text-amber-300/80 leading-relaxed mt-0.5">
                  Running directly on your <b>Intel Core Ultra / Intel Arc GPU & NPU</b> via OpenVINO & QuickSync. $0 API cost, zero cloud data transfer, and 100% offline capability.
                </p>
              </div>
            </div>
          )}

          {byokMode === "developer" && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-300 flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-emerald-200">Developer Demo Mode Active</p>
                <p className="text-[11px] text-emerald-300/80 leading-relaxed mt-0.5">
                  Pre-configured with ClipVault Developer Master credentials. Works out of the box with zero setup required.
                </p>
              </div>
            </div>
          )}

          {/* Category Filter Tabs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Select Active Model Engine
              </label>
              <span className="text-[10px] text-gray-500">
                {filteredEngines.length} Available Engines
              </span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {[
                { id: "all", label: "All Models" },
                { id: "local-hardware", label: "⚡ Local Hardware" },
                { id: "ultra-fast", label: "⚡ Ultra-Fast Cloud" },
                { id: "frontier-llm", label: "🌐 Frontier LLMs" },
                { id: "video-gen", label: "🎬 Video Motion" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveCategory(tab.id as any)}
                  className={`px-3 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                    activeCategory === tab.id
                      ? "bg-white/15 text-white border border-white/20"
                      : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Engine Grid */}
            <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
              {filteredEngines.map((e) => {
                const isSelected = selectedEngine === e.id;
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => onSelectEngine(e.id)}
                    className={`p-3 rounded-2xl text-left border transition-all cursor-pointer relative flex flex-col justify-between ${
                      isSelected
                        ? "bg-amber-400/10 border-amber-400 text-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.15)]"
                        : "bg-white/[0.03] border-white/5 text-gray-300 hover:bg-white/[0.07] hover:border-white/15"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1.5 mb-1">
                        <span className="font-bold text-xs flex items-center gap-1.5 truncate">
                          {e.isHardware && <Zap className="w-3 h-3 text-amber-400 flex-shrink-0" />}
                          {e.name}
                        </span>
                        {e.badge && (
                          <span className={`px-1.5 py-0.2 rounded-full text-[8px] font-extrabold uppercase ${
                            isSelected
                              ? "bg-amber-400 text-black"
                              : "bg-white/10 text-gray-300"
                          }`}>
                            {e.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 line-clamp-2 leading-relaxed">
                        {e.desc}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="mt-2 flex items-center gap-1 text-[9px] font-bold text-amber-400">
                        <CheckCircle2 className="w-3 h-3" /> Active Engine
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* BYOK API Key Vault (Visible when BYOK mode is Custom) */}
          {byokMode === "custom" && (
            <div className="space-y-3 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Private API Key Vault (BYOK)
                </label>
                <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Encrypted in Local Storage
                </span>
              </div>

              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
                {/* Groq LPU */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-gray-300 font-bold flex items-center gap-1.5">
                      ⚡ Groq LPU API Key (500+ t/s Llama 3.3)
                    </span>
                    <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-amber-400 hover:underline flex items-center gap-0.5">
                      Get Key <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <input
                    type="password"
                    value={groqKey}
                    onChange={(e) => setGroqKey(e.target.value)}
                    placeholder="gsk_..."
                    className="w-full rounded-xl px-3 py-2 text-xs text-white bg-white/5 border border-white/10 outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                {/* DeepSeek */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-gray-300 font-bold flex items-center gap-1.5">
                      🐋 DeepSeek V3 / R1 Key
                    </span>
                    <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noreferrer" className="text-amber-400 hover:underline flex items-center gap-0.5">
                      Get Key <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <input
                    type="password"
                    value={deepseekKey}
                    onChange={(e) => setDeepseekKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full rounded-xl px-3 py-2 text-xs text-white bg-white/5 border border-white/10 outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                {/* Google Gemini */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-gray-300 font-bold flex items-center gap-1.5">
                      💎 Google Gemini 2.5 Key
                    </span>
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-amber-400 hover:underline flex items-center gap-0.5">
                      Get Key <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <input
                    type="password"
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full rounded-xl px-3 py-2 text-xs text-white bg-white/5 border border-white/10 outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                {/* OpenAI */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-gray-300 font-bold flex items-center gap-1.5">
                      🤖 OpenAI ChatGPT / GPT-4o Key
                    </span>
                    <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-amber-400 hover:underline flex items-center gap-0.5">
                      Get Key <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <input
                    type="password"
                    value={openAiKey}
                    onChange={(e) => setOpenAiKey(e.target.value)}
                    placeholder="sk-proj-..."
                    className="w-full rounded-xl px-3 py-2 text-xs text-white bg-white/5 border border-white/10 outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                {/* Anthropic Claude */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-gray-300 font-bold flex items-center gap-1.5">
                      🧠 Anthropic Claude 3.7 Key
                    </span>
                    <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" className="text-amber-400 hover:underline flex items-center gap-0.5">
                      Get Key <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <input
                    type="password"
                    value={anthropicKey}
                    onChange={(e) => setAnthropicKey(e.target.value)}
                    placeholder="sk-ant-api03-..."
                    className="w-full rounded-xl px-3 py-2 text-xs text-white bg-white/5 border border-white/10 outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                {/* Moonshot / Moonlight */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-gray-300 font-bold flex items-center gap-1.5">
                      🌙 Moonshot / Moonlight AI Key
                    </span>
                    <a href="https://platform.moonshot.cn/console/api-keys" target="_blank" rel="noreferrer" className="text-amber-400 hover:underline flex items-center gap-0.5">
                      Get Key <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <input
                    type="password"
                    value={moonlightKey}
                    onChange={(e) => setMoonlightKey(e.target.value)}
                    placeholder="sk-moon-..."
                    className="w-full rounded-xl px-3 py-2 text-xs text-white bg-white/5 border border-white/10 outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                {/* Qwen Alibaba DashScope */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-gray-300 font-bold flex items-center gap-1.5">
                      🌌 Alibaba Qwen 2.5 DashScope Key
                    </span>
                    <a href="https://dashscope.console.aliyun.com" target="_blank" rel="noreferrer" className="text-amber-400 hover:underline flex items-center gap-0.5">
                      Get Key <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <input
                    type="password"
                    value={qwenKey}
                    onChange={(e) => setQwenKey(e.target.value)}
                    placeholder="sk-qwen-..."
                    className="w-full rounded-xl px-3 py-2 text-xs text-white bg-white/5 border border-white/10 outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                {/* Higgsfield AI */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-gray-300 font-bold flex items-center gap-1.5">
                      🎬 Higgsfield AI Key
                    </span>
                    <a href="https://higgsfield.ai" target="_blank" rel="noreferrer" className="text-amber-400 hover:underline flex items-center gap-0.5">
                      Get Key <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <input
                    type="password"
                    value={higgsfieldKey}
                    onChange={(e) => setHiggsfieldKey(e.target.value)}
                    placeholder="hg-live-..."
                    className="w-full rounded-xl px-3 py-2 text-xs text-white bg-white/5 border border-white/10 outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                {/* SeeDance AI */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-gray-300 font-bold flex items-center gap-1.5">
                      💃 SeeDance AI Key (ByteDance)
                    </span>
                    <a href="https://seedance.ai" target="_blank" rel="noreferrer" className="text-amber-400 hover:underline flex items-center gap-0.5">
                      Get Key <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <input
                    type="password"
                    value={seeDanceKey}
                    onChange={(e) => setSeeDanceKey(e.target.value)}
                    placeholder="sd-prod-..."
                    className="w-full rounded-xl px-3 py-2 text-xs text-white bg-white/5 border border-white/10 outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                {/* Custom Base URL / Proxy / Ollama */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-gray-300 font-bold flex items-center gap-1.5">
                      🌐 Custom OpenAI-Compatible Base URL (Ollama / Local LLM / Proxy)
                    </span>
                  </div>
                  <input
                    type="text"
                    value={customBaseUrl}
                    onChange={(e) => setCustomBaseUrl(e.target.value)}
                    placeholder="e.g. http://localhost:11434/v1 or https://api.chatanywhere.tech/v1"
                    className="w-full rounded-xl px-3 py-2 text-xs text-white bg-white/5 border border-white/10 outline-none focus:border-amber-400 font-mono"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-black/60 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-gray-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Active: <b>{(engines.find((e) => e.id === selectedEngine) || engines[0])?.name || "AI Engine"}</b></span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-400 text-black font-bold text-xs hover:bg-amber-300 transition-all cursor-pointer shadow-md"
          >
            Done & Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

