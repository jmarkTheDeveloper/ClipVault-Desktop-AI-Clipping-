import React, { useState, useRef, useEffect } from "react";
import {
  ArrowLeft, Sparkles, Send, Bot, User, Key, CheckCircle2,
  Play, Pause, Download, ExternalLink, RefreshCw, Wand2,
  Smartphone, Monitor, Video, Volume2, ShieldCheck, Film, Layers,
  FileText, Copy, Check, Plus, Sliders, ChevronRight, Cpu, Radio
} from "lucide-react";
import { GreenBtn } from "../components/SharedUI";
import { MEDIA_LIBRARY, saveLibraries } from "../utils/types";

interface Props {
  onBack: () => void;
  onOpenEditor: () => void;
}

interface ChatMessage {
  id: string;
  sender: "ai" | "user";
  text: string;
  timestamp: string;
  engineUsed?: string;
  videoResult?: {
    title: string;
    duration: string;
    url: string;
    ratio: string;
    hook: string;
    body: string;
    cta: string;
    engine: string;
  };
}

const DEFAULT_ENGINE = { id: "higgsfield", name: "Higgsfield AI", provider: "Higgsfield", desc: "Best for Cinematic Camera Motion & Video" };

const AI_ENGINES = [
  { id: "claude_fable", name: "Claude Fable", provider: "Anthropic", desc: "Best for Viral Hooks & Scriptwriting" },
  { id: "higgsfield", name: "Higgsfield AI", provider: "Higgsfield", desc: "Best for Cinematic Camera Motion & Video" },
  { id: "seedance", name: "SeeDance AI", provider: "ByteDance", desc: "Best for Music Beat Sync & Dance Clips" },
  { id: "openai_sora", name: "OpenAI Sora / GPT-4o", provider: "OpenAI", desc: "General Video & Subtitle Model" },
];

const SAMPLE_VIDEOS = [
  "https://assets.mixkit.co/videos/preview/mixkit-singapore-city-skyline-at-night-41235-large.mp4",
  "https://assets.mixkit.co/videos/preview/mixkit-waves-in-the-water-1164-large.mp4",
  "https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-529-large.mp4"
];

export function AiChatVideoScreen({ onBack, onOpenEditor }: Props) {
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
    } catch(e) {}
  }, [anthropicKey, higgsfieldKey, seeDanceKey, openAiKey]);

  // Chat Prompt State
  const [inputPrompt, setInputPrompt] = useState("");
  const [selectedRatio, setSelectedRatio] = useState<"9:16" | "16:9" | "1:1">("9:16");

  // Initial Welcome & Chat History
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      sender: "ai",
      text: "👋 Welcome to ClipVault AI Video Studio! Powered by Higgsfield AI, SeeDance AI, and Claude Fable. Describe the video or script you'd like to generate, and our multi-model AI pipeline will construct the script, b-roll video, and subtitles automatically!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ]);

  const [isAiThinking, setIsAiThinking] = useState(false);
  const [generationStep, setGenerationStep] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAiThinking, generationStep]);

  const handleSendMessage = (promptText?: string) => {
    const textToSend = promptText || inputPrompt;
    if (!textToSend.trim() || isAiThinking) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!promptText) setInputPrompt("");
    setIsAiThinking(true);

    const activeEngineObj = AI_ENGINES.find(e => e.id === selectedEngine) ?? DEFAULT_ENGINE;

    // Multi-Step AI Pipeline Simulation (Claude Fable -> Higgsfield AI -> SeeDance AI)
    setGenerationStep(`🧠 Claude Fable: Writing viral hook & 3-part script breakdown for "${textToSend.substring(0, 20)}..."`);
    
    setTimeout(() => {
      setGenerationStep(`🎥 ${activeEngineObj.name}: Synthesizing ${selectedRatio} video frames & camera motion vectors...`);
    }, 1000);

    setTimeout(() => {
      setGenerationStep(`⚡ SeeDance AI: Aligning beat drop markers and auto-generating dynamic captions...`);
    }, 2000);

    setTimeout(() => {
      const topicName = textToSend.length > 35 ? textToSend.substring(0, 35) + "..." : textToSend;
      const sampleVid = SAMPLE_VIDEOS[Math.floor(Math.random() * SAMPLE_VIDEOS.length)] || SAMPLE_VIDEOS[0];

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: `✨ Generated a viral video for "${topicName}" (${selectedRatio}) using ${activeEngineObj.name} & Claude Fable. Click "Open in Video Editor" below to load the video and subtitles directly onto your editing timeline!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        engineUsed: activeEngineObj.name,
        videoResult: {
          title: `AI Video (${activeEngineObj.name}): ${topicName}`,
          duration: "0:30",
          url: String(sampleVid),
          ratio: selectedRatio,
          hook: `🚀 Stop scrolling! Here is what nobody tells you about ${topicName}.`,
          body: `Step 1: Focus on high visual contrast and fast hook edits. Step 2: Keep pacing under 0.8s per cut. Step 3: Add dynamic animated text captions.`,
          cta: `🔥 Follow @ClipVault for daily studio editing workflows!`,
          engine: activeEngineObj.name
        }
      };

      setMessages((prev) => [...prev, aiMsg]);
      setIsAiThinking(false);
      setGenerationStep("");
    }, 3000);
  };

  const handleSendToEditor = (result: NonNullable<ChatMessage["videoResult"]>) => {
    const newId = Date.now();
    const videoUrl = result.url || SAMPLE_VIDEOS[0];

    // 1. Push generated video to MEDIA_LIBRARY
    const newMedia = {
      id: newId,
      type: "video",
      name: result.title,
      thumb: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=225&fit=crop&auto=format",
      duration: 30,
      url: videoUrl,
    };
    (MEDIA_LIBRARY as any).push(newMedia);
    saveLibraries();

    // 2. Build initial timeline state with AI video clip & synchronized subtitle text clips
    const videoClip = {
      id: newId + 1,
      mediaId: newId,
      name: result.title,
      startTime: 0,
      duration: 30,
      track: 0,
      volume: 100,
      speed: 1.0,
      opacity: 100,
      rotation: 0,
      scale: 100,
      url: videoUrl,
    };

    const textHook = {
      id: newId + 2,
      text: result.hook,
      startTime: 0,
      duration: 5,
      track: 1,
      style: { color: "#ffffff", fontSize: 24, fontWeight: "bold" },
    };

    const textBody = {
      id: newId + 3,
      text: result.body,
      startTime: 5,
      duration: 20,
      track: 1,
      style: { color: "#00e676", fontSize: 20, fontWeight: "bold" },
    };

    const textCta = {
      id: newId + 4,
      text: result.cta,
      startTime: 25,
      duration: 5,
      track: 1,
      style: { color: "#ffd600", fontSize: 22, fontWeight: "bold" },
    };

    const newEditorState = {
      clips: [videoClip],
      audioClips: [],
      textClips: [textHook, textBody, textCta],
    };

    try {
      localStorage.setItem("clipvault_history", JSON.stringify([newEditorState]));
      localStorage.setItem("clipvault_histIdx", "0");
    } catch (e) {}

    onOpenEditor();
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#050505] font-['Inter',sans-serif] select-none overflow-hidden">
      {/* ── TOP HEADER ── */}
      <header className="h-16 pt-7 px-6 flex items-center justify-between border-b border-[#00e676]/10 bg-[#070707]/90 backdrop-blur-xl z-20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all text-xs font-semibold cursor-pointer border border-white/5"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </button>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#00e676] to-[#00a854] flex items-center justify-center shadow-[0_0_15px_rgba(0,230,118,0.4)]">
              <Bot className="w-4 h-4 text-black" />
            </div>
            <div>
              <h2 className="text-white text-sm font-bold flex items-center gap-2">
                ClipVault AI Video Generator <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              </h2>
              <p className="text-[10px] text-gray-400">Higgsfield AI · SeeDance AI · Claude Fable</p>
            </div>
          </div>
        </div>

        {/* AI ENGINE & BYOK KEY SELECTOR BADGE */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowKeySettings(!showKeySettings)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-[#00e676]/30 text-xs text-white transition-all cursor-pointer shadow-md"
          >
            <Cpu className="w-3.5 h-3.5 text-[#00e676]" />
            <span className="font-bold">Engine:</span>
            <span className="text-[#00e676] font-semibold">
              {(AI_ENGINES.find(e => e.id === selectedEngine) ?? DEFAULT_ENGINE).name} ({byokMode === "developer" ? "Demo Key" : "BYOK Key"})
            </span>
          </button>
        </div>
      </header>

      {/* ── BYOK KEY & ENGINE SETTINGS DROPDOWN ── */}
      {showKeySettings && (
        <div className="absolute top-16 right-6 z-50 w-[420px] p-5 rounded-2xl bg-[#0d0d0d] border border-white/15 shadow-2xl space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h4 className="text-white font-bold text-xs flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#00e676]" /> AI Video Engine & BYOK Settings
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
                  className={`p-2.5 rounded-xl text-left border transition-all ${
                    selectedEngine === e.id
                      ? "bg-[#00e676]/10 border-[#00e676] text-[#00e676]"
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
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                byokMode === "developer" ? "bg-[#00e676] text-black shadow-md" : "text-gray-400 hover:text-white"
              }`}
            >
              Developer Key (Demo)
            </button>
            <button
              onClick={() => setByokMode("custom")}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                byokMode === "custom" ? "bg-[#00e676] text-black shadow-md" : "text-gray-400 hover:text-white"
              }`}
            >
              Custom Key (BYOK)
            </button>
          </div>

          {byokMode === "developer" ? (
            <div className="p-3 rounded-xl bg-[#00e676]/10 border border-[#00e676]/20 text-xs text-[#00e676] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Developer Master API Key Active (`sk-clipvault-demo-key`). Ready out of the box!</span>
            </div>
          ) : (
            <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1 scrollbar-hide">
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-gray-300 font-bold">🧠 Anthropic API Key (Claude Fable)</span>
                  <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" className="text-[#00e676] hover:underline">Get Key ↗</a>
                </div>
                <input
                  type="password"
                  value={anthropicKey}
                  onChange={(e) => setAnthropicKey(e.target.value)}
                  placeholder="sk-ant-api03-..."
                  className="w-full rounded-xl px-3 py-1.5 text-xs text-white bg-white/5 border border-white/10 outline-none focus:border-[#00e676]"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-gray-300 font-bold">🎥 Higgsfield AI Key</span>
                  <a href="https://higgsfield.ai" target="_blank" rel="noreferrer" className="text-[#00e676] hover:underline">Get Key ↗</a>
                </div>
                <input
                  type="password"
                  value={higgsfieldKey}
                  onChange={(e) => setHiggsfieldKey(e.target.value)}
                  placeholder="hg-live-..."
                  className="w-full rounded-xl px-3 py-1.5 text-xs text-white bg-white/5 border border-white/10 outline-none focus:border-[#00e676]"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-gray-300 font-bold">⚡ SeeDance AI Key (ByteDance)</span>
                  <a href="https://seedance.ai" target="_blank" rel="noreferrer" className="text-[#00e676] hover:underline">Get Key ↗</a>
                </div>
                <input
                  type="password"
                  value={seeDanceKey}
                  onChange={(e) => setSeeDanceKey(e.target.value)}
                  placeholder="sd-prod-..."
                  className="w-full rounded-xl px-3 py-1.5 text-xs text-white bg-white/5 border border-white/10 outline-none focus:border-[#00e676]"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-gray-300 font-bold">🤖 OpenAI Sora / GPT-4o Key</span>
                  <a href="https://platform.openai.com" target="_blank" rel="noreferrer" className="text-[#00e676] hover:underline">Get Key ↗</a>
                </div>
                <input
                  type="password"
                  value={openAiKey}
                  onChange={(e) => setOpenAiKey(e.target.value)}
                  placeholder="sk-proj-..."
                  className="w-full rounded-xl px-3 py-1.5 text-xs text-white bg-white/5 border border-white/10 outline-none focus:border-[#00e676]"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MAIN CHAT MESSAGES FEED ── */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-6 space-y-6 max-w-4xl mx-auto w-full">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start gap-3.5 ${m.sender === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            {/* Avatar */}
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md ${
                m.sender === "user"
                  ? "bg-gradient-to-br from-[#00e676] to-[#00a854] text-black font-bold text-xs"
                  : "bg-white/10 border border-white/15 text-white"
              }`}
            >
              {m.sender === "user" ? "JD" : <Bot className="w-4 h-4 text-[#00e676]" />}
            </div>

            {/* Bubble Container */}
            <div className={`space-y-3 max-w-[80%] ${m.sender === "user" ? "items-end text-right" : "items-start text-left"}`}>
              <div
                className={`p-4 rounded-2xl text-xs leading-relaxed shadow-xl border ${
                  m.sender === "user"
                    ? "bg-[#00e676]/15 text-white border-[#00e676]/30 rounded-tr-none"
                    : "bg-[#0d0d0d] text-gray-200 border-white/10 rounded-tl-none"
                }`}
              >
                <p className="whitespace-pre-wrap">{m.text}</p>
                {m.engineUsed && (
                  <span className="inline-block mt-2 px-2 py-0.5 rounded text-[9px] font-bold bg-[#00e676]/10 text-[#00e676] border border-[#00e676]/20">
                    Model: {m.engineUsed}
                  </span>
                )}
                <span className="text-[9px] text-gray-500 mt-1 block font-mono">{m.timestamp}</span>
              </div>

              {/* GENERATED VIDEO RESULT CARD */}
              {m.videoResult && (
                <div className="p-4 rounded-2xl bg-[#0d0d0d] border border-[#00e676]/30 space-y-3 shadow-2xl animate-fadeIn w-full">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <span className="text-xs font-bold text-[#00e676] flex items-center gap-1.5">
                      <Film className="w-4 h-4" /> {m.videoResult.title}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-gray-400 font-mono">
                      {m.videoResult.ratio} · {m.videoResult.duration}
                    </span>
                  </div>

                  {/* Video Player */}
                  <div className="aspect-video rounded-xl overflow-hidden bg-black relative border border-white/10">
                    <video
                      src={m.videoResult.url}
                      controls
                      preload="metadata"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Script Breakdown */}
                  <div className="p-3 rounded-xl bg-white/[0.03] space-y-2 text-[11px]">
                    <div>
                      <span className="text-[9px] font-bold uppercase text-amber-400 block">Hook</span>
                      <p className="text-gray-300">{m.videoResult.hook}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold uppercase text-emerald-400 block">Body</span>
                      <p className="text-gray-400">{m.videoResult.body}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold uppercase text-purple-400 block">CTA</span>
                      <p className="text-gray-300">{m.videoResult.cta}</p>
                    </div>
                  </div>

                  <GreenBtn onClick={() => handleSendToEditor(m.videoResult!)} size="md" className="w-full justify-center">
                    <Play className="w-4 h-4 fill-current" /> Open in Video Editor
                  </GreenBtn>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* AI Multi-Step Generation Progress Indicator */}
        {isAiThinking && (
          <div className="flex items-center gap-3 animate-fadeIn">
            <div className="w-9 h-9 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center">
              <Bot className="w-4 h-4 text-[#00e676] animate-pulse" />
            </div>
            <div className="p-3.5 rounded-2xl rounded-tl-none bg-[#0d0d0d] border border-white/10 text-xs text-gray-300 flex items-center gap-2 shadow-xl">
              <Wand2 className="w-4 h-4 text-[#00e676] animate-spin" />
              <span>{generationStep || "Initializing AI generation pipeline..."}</span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* ── BOTTOM CHAT PROMPT INPUT BAR ── */}
      <footer className="p-4 border-t border-[#00e676]/10 bg-[#070707]/90 backdrop-blur-xl z-20 flex-shrink-0">
        <div className="max-w-4xl mx-auto space-y-3">
          {/* Quick Preset Chips */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide text-xs">
            <span className="text-[10px] text-gray-500 font-bold uppercase flex-shrink-0">Quick Prompts:</span>
            {[
              "⚡ 5 TikTok Viral Editing Hacks",
              "🎥 Higgsfield Camera Motion Reel",
              "🎵 SeeDance Beat Drop Sync Short",
              "🎙️ Claude Fable Storytelling Script"
            ].map((chip) => (
              <button
                key={chip}
                onClick={() => handleSendMessage(chip)}
                className="px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#00e676]/30 text-gray-300 hover:text-white transition-all whitespace-nowrap cursor-pointer text-[11px]"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Prompt Bar Controls */}
          <div className="flex items-center gap-3 bg-[#0d0d0d] border border-white/15 focus-within:border-[#00e676]/50 rounded-2xl p-2 shadow-2xl transition-all">
            {/* Ratio Dropdown Pill */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-300 flex-shrink-0">
              <Smartphone className="w-3.5 h-3.5 text-[#00e676]" />
              <select
                value={selectedRatio}
                onChange={(e: any) => setSelectedRatio(e.target.value)}
                className="bg-transparent text-white text-xs outline-none cursor-pointer font-semibold"
              >
                <option value="9:16" style={{ background: "#111" }}>9:16 (Shorts/TikTok)</option>
                <option value="16:9" style={{ background: "#111" }}>16:9 (YouTube Wide)</option>
                <option value="1:1" style={{ background: "#111" }}>1:1 (Square Feed)</option>
              </select>
            </div>

            {/* Input Field */}
            <input
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Ask AI to generate a video... e.g. 'Generate a 30s Higgsfield cinematic video about 3 Tech Hacks'"
              className="flex-1 bg-transparent text-white text-xs outline-none placeholder-gray-500 px-2"
            />

            {/* Send Button */}
            <GreenBtn
              onClick={() => handleSendMessage()}
              disabled={!inputPrompt.trim() || isAiThinking}
              size="sm"
              className="rounded-xl flex-shrink-0 disabled:opacity-30"
            >
              <Send className="w-3.5 h-3.5" /> Send
            </GreenBtn>
          </div>
        </div>
      </footer>
    </div>
  );
}
