import React from "react";
import { Cpu, CheckCircle2 } from "lucide-react";
import type { EngineOption } from "./types";

interface EngineSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  engines: EngineOption[];
  selectedEngine: string;
  onSelectEngine: (engineId: string) => void;
  byokMode: "developer" | "custom";
  setByokMode: (mode: "developer" | "custom") => void;
  anthropicKey: string;
  setAnthropicKey: (val: string) => void;
  higgsfieldKey: string;
  setHiggsfieldKey: (val: string) => void;
  seeDanceKey: string;
  setSeeDanceKey: (val: string) => void;
  openAiKey: string;
  setOpenAiKey: (val: string) => void;
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
  customBaseUrl,
  setCustomBaseUrl,
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute top-20 right-36 z-50 w-[420px] p-5 rounded-2xl bg-[#0d0d0d] border border-white/15 shadow-2xl space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h4 className="text-white font-bold text-xs flex items-center gap-2">
          <Cpu className="w-4 h-4 text-amber-400" /> AI Video Engine & BYOK Settings
        </h4>
        <button onClick={onClose} className="text-xs text-gray-400 hover:text-white cursor-pointer">
          ✕
        </button>
      </div>

      {/* AI Engine Selection */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
          Active AI Model Engine
        </label>
        <div className="grid grid-cols-2 gap-2">
          {engines.map((e) => (
            <button
              key={e.id}
              onClick={() => onSelectEngine(e.id)}
              className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                selectedEngine === e.id
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
          className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
            byokMode === "developer" ? "bg-amber-400 text-black shadow-md" : "text-gray-400 hover:text-white"
          }`}
        >
          Developer Key (Demo)
        </button>
        <button
          onClick={() => setByokMode("custom")}
          className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
            byokMode === "custom" ? "bg-amber-400 text-black shadow-md" : "text-gray-400 hover:text-white"
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
              <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" className="text-amber-400 hover:underline">
                Get Key ↗
              </a>
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
              <a href="https://higgsfield.ai" target="_blank" rel="noreferrer" className="text-amber-400 hover:underline">
                Get Key ↗
              </a>
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
              <a href="https://seedance.ai" target="_blank" rel="noreferrer" className="text-amber-400 hover:underline">
                Get Key ↗
              </a>
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
              <a href="https://platform.openai.com" target="_blank" rel="noreferrer" className="text-amber-400 hover:underline">
                Get Key ↗
              </a>
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
  );
};
