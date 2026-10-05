import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Send,
  X,
  RotateCcw,
  Play,
  Scissors,
  Loader2,
  Check,
  Clock,
  ChevronRight,
  Flame,
  ShieldCheck,
  Lock,
  Key,
  AlertTriangle,
  Search,
  Info
} from "lucide-react";

export interface VideoMoment {
  start: number;
  end: number;
  label: string;
  title: string;
  reason: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  moments?: VideoMoment[];
  timestamp: string;
  isSecurityNotice?: boolean;
}

interface AskStudioPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  ytUrl?: string;
  activeVideoUrl?: string;
  localFilePath?: string;
  currentTime?: number;
  onSeek?: (seconds: number) => void;
  onSetClipBounds?: (startSec: number, endSec: number) => void;
  onOpenEngineSettings?: () => void;
  activeEngineKey?: string;
  isKeyMissingForActiveEngine?: boolean;
  selectedEngine?: string;
  activeEngineName?: string;
}

const DEFAULT_SUGGESTIONS = [
  "Give me timestamps of the most interesting moments",
  "Summarize what this video is about",
  "Find the funniest or most intense moments",
  "What are the main topics discussed?",
  "When does the conversation get deep or controversial?",
];

// Client-side Security Shield Patterns
const CREDENTIAL_INSPECTION_REGEX = /\b(?:api[-_\s]?key|bearer|token|secret|password|credential|gemini[-_\s]?key|openai[-_\s]?key|system[-_\s]?prompt|instructions|ignore.*instructions|jailbreak|environ|\.env)\b/i;
const OFFTOPIC_INSPECTION_REGEX = /\b(?:what\s+is\s+python|who\s+is\s+(?:the\s+)?(?:government|president|prime\s+minister)|write\s+(?:code|python|script|poem)|solve\s+math)\b/i;

function AssistantMessageBody({
  content,
  isSecurityNotice,
}: {
  content: string;
  isSecurityNotice?: boolean;
}) {
  if (isSecurityNotice) {
    return (
      <div className="flex items-start gap-2.5 text-xs text-emerald-200 leading-relaxed font-medium">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <p className="m-0">{content}</p>
      </div>
    );
  }

  // 1. Clean subtitle VTT artifacts e.g. '>>' or '&gt;&gt;'
  const sanitizedContent = content.replace(/>>|&gt;&gt;/g, "").trim();

  // 2. Check for query echo match e.g. "Here are key moments matching your query: **"..."**" or similar
  const queryMatch = sanitizedContent.match(
    /(?:matching your query|matching query|for your query)[:\s]*\*{0,2}["“]([^"”]+)["”]\*{0,2}/i
  );
  const matchedQuery = queryMatch ? queryMatch[1] : null;

  // Split lines into non-empty blocks
  const rawLines = sanitizedContent
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Helper to render bold, italic, and timestamp badges within a single string
  const renderFormattedLine = (line: string) => {
    // Regex to split tokens: [timestamp] or **bold** or *italic* or "quotes"
    const tokenRegex = /(\[[\d:]+(?:\s*-\s*[\d:]+)?\]|\*\*[^*]+\*\*|\*[^*]+\*|"[^"]+")/g;
    const parts = line.split(tokenRegex);

    return parts.map((part, idx) => {
      if (!part) return null;

      // Timestamp token e.g. [02:04:03 - 02:04:15] or [20:51 - 21:03]
      const tsMatch = part.match(/^\[([\d:]+(?:\s*-\s*[\d:]+)?)\]$/);
      if (tsMatch) {
        return (
          <span
            key={idx}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-400/15 text-emerald-300 font-mono text-[10.5px] font-bold border border-emerald-400/30 mx-1 align-baseline"
          >
            <Clock className="w-2.5 h-2.5 text-emerald-400 inline" />
            {tsMatch[1]}
          </span>
        );
      }

      // Bold token **...**
      if (part.startsWith("**") && part.endsWith("**")) {
        const text = part.slice(2, -2).trim();
        return (
          <strong key={idx} className="text-white font-bold">
            {text}
          </strong>
        );
      }

      // Italic token *...*
      if (part.startsWith("*") && part.endsWith("*")) {
        const text = part.slice(1, -1).trim();
        return (
          <em key={idx} className="text-emerald-300/90 font-medium not-italic">
            {text}
          </em>
        );
      }

      // Speech Quote "... "
      if (part.startsWith('"') && part.endsWith('"')) {
        return (
          <span key={idx} className="text-gray-300 italic font-normal">
            {part}
          </span>
        );
      }

      return <span key={idx}>{part}</span>;
    });
  };

  // Check if line is a tip
  const isTipLine = (line: string) => /^\*?tip:/i.test(line.trim());

  // Check if line is a bullet moment
  const isBulletMoment = (line: string) => /^[-*•]\s*\*{0,2}\[[\d:]+/i.test(line.trim());

  // Check if line is a general bullet
  const isGeneralBullet = (line: string) => /^[-*•]\s+/.test(line.trim());

  return (
    <div className="space-y-2.5 text-xs leading-relaxed">
      {/* ── Sleek Matched Query Header Chip ── */}
      {matchedQuery && (
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-gray-300 shadow-sm mb-1">
          <Search className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-400 font-bold block">
              Matched Video Query
            </span>
            <p className="text-xs text-white font-medium italic mt-0.5">
              &ldquo;{matchedQuery}&rdquo;
            </p>
          </div>
        </div>
      )}

      {/* ── Parsed Content Blocks ── */}
      {rawLines.map((line, lIdx) => {
        // Skip query echo intro line if we already rendered the chip above
        if (
          matchedQuery &&
          /^(?:Here are key moments matching your query|Matching query)/i.test(line)
        ) {
          return null;
        }

        // Render Tip line with special highlight styling
        if (isTipLine(line)) {
          const tipText = line.replace(/^\*?tip:\s*/i, "").replace(/\*+$/g, "").trim();
          return (
            <div
              key={lIdx}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-400/[0.07] border border-emerald-400/25 text-[11px] text-emerald-300 mt-2 shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <div className="min-w-0 flex-1 leading-snug">
                <span className="font-bold text-white mr-1">Pro Tip:</span>
                {renderFormattedLine(tipText)}
              </div>
            </div>
          );
        }

        // Render bullet moment line cleanly
        if (isBulletMoment(line)) {
          const cleanedBullet = line.replace(/^[-*•]\s*/, "");
          return (
            <div
              key={lIdx}
              className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-emerald-400/25 transition-all text-gray-200"
            >
              <div className="flex items-baseline flex-wrap gap-1 leading-snug">
                {renderFormattedLine(cleanedBullet)}
              </div>
            </div>
          );
        }

        // Render blockquote if line starts with >
        if (line.startsWith(">")) {
          const quoteText = line.replace(/^>\s*/, "");
          return (
            <div
              key={lIdx}
              className="border-l-2 border-emerald-400/50 pl-2.5 py-1 text-gray-300 italic text-[11.5px] bg-white/[0.02] rounded-r-lg"
            >
              {renderFormattedLine(quoteText)}
            </div>
          );
        }

        // Render general bullet line
        if (isGeneralBullet(line)) {
          const bulletText = line.replace(/^[-*•]\s+/, "");
          return (
            <div key={lIdx} className="flex items-start gap-2 text-gray-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
              <div className="flex-1">{renderFormattedLine(bulletText)}</div>
            </div>
          );
        }

        // Regular paragraph / prose line
        return (
          <p key={lIdx} className="text-gray-200 leading-relaxed m-0">
            {renderFormattedLine(line)}
          </p>
        );
      })}
    </div>
  );
}

export function AskStudioPanel({
  isOpen,
  onClose,
  onOpen,
  ytUrl,
  activeVideoUrl,
  localFilePath,
  currentTime = 0,
  onSeek,
  onSetClipBounds,
  onOpenEngineSettings,
  activeEngineKey,
  isKeyMissingForActiveEngine,
  selectedEngine,
  activeEngineName,
}: AskStudioPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pinnedMomentIndex, setPinnedMomentIndex] = useState<string | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);

  const isDummyKey = (k?: string | null) => {
    if (!k) return true;
    const trimmed = k.trim();
    const lower = trimmed.toLowerCase();
    // Placeholder values only. This used to also compare against the vendor's real Gemini key,
    // which compiled that live credential into the shipped renderer bundle.
    return (
      trimmed === "" ||
      lower === "your_api_key_here" ||
      lower === "demo" ||
      lower === "null" ||
      lower === "undefined"
    );
  };

  // Check if user has configured any valid API key
  const getActiveApiKeyInfo = (): { key: string; engine: string } => {
    // 1. If activeEngineKey is provided and not dummy, return it
    if (activeEngineKey && !isDummyKey(activeEngineKey)) {
      return { key: activeEngineKey.trim(), engine: selectedEngine || "gemini" };
    }

    // 2. Check engine-specific key in localStorage
    if (selectedEngine) {
      const engineKeyMap: Record<string, string> = {
        openai_chatgpt: "clipvault_openai_key",
        claude_fable: "clipvault_anthropic_key",
        gemini_flash: "clipvault_gemini_key",
        groq_lpu: "clipvault_groq_key",
        deepseek: "clipvault_deepseek_key",
        moonlight: "clipvault_moonlight_key",
        qwen_ai: "clipvault_qwen_key",
        qwen: "clipvault_qwen_key",
        higgsfield: "clipvault_higgsfield_key",
        seedance: "clipvault_seedance_key",
      };
      const storageKey = engineKeyMap[selectedEngine];
      if (storageKey) {
        const stored = localStorage.getItem(storageKey)?.trim();
        if (stored && !isDummyKey(stored)) {
          return { key: stored, engine: selectedEngine };
        }
      }
    }

    // 3. Fallback to any valid LLM key configured on device
    const fallbackList = [
      { id: "groq_lpu", key: localStorage.getItem("clipvault_groq_key") },
      { id: "gemini_flash", key: localStorage.getItem("clipvault_gemini_key") },
      { id: "openai_chatgpt", key: localStorage.getItem("clipvault_openai_key") },
      { id: "claude_fable", key: localStorage.getItem("clipvault_anthropic_key") },
      { id: "deepseek", key: localStorage.getItem("clipvault_deepseek_key") },
      { id: "moonlight", key: localStorage.getItem("clipvault_moonlight_key") },
      { id: "qwen_ai", key: localStorage.getItem("clipvault_qwen_key") },
    ];
    for (const item of fallbackList) {
      if (item.key && !isDummyKey(item.key)) {
        return { key: item.key.trim(), engine: item.id };
      }
    }
    return { key: "", engine: selectedEngine || "gemini" };
  };

  const keyInfo = getActiveApiKeyInfo();
  // If active engine is cloud and requires its specific key which is missing, or no API key is detected anywhere
  const hasApiKey = !isKeyMissingForActiveEngine && Boolean(keyInfo.key);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen && inputRef.current && hasApiKey) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, hasApiKey]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || isLoading) return;

    // Gate: Check API Key presence
    if (!hasApiKey) {
      setShowKeyModal(true);
      return;
    }

    setInputText("");

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);

    // ── CLIENT-SIDE SECURITY SHIELD LAYER 1: CREDENTIALS FIREWALL ───
    if (CREDENTIAL_INSPECTION_REGEX.test(query)) {
      const securityBlockedMsg: ChatMessage = {
        id: `sec-${Date.now()}`,
        role: "assistant",
        isSecurityNotice: true,
        content: "Security Shield Active: System credentials, API keys, and internal configurations are strictly protected and confidential. They cannot be shared, displayed, or discussed under any circumstances.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, securityBlockedMsg]);
      return;
    }

    // ── CLIENT-SIDE SECURITY SHIELD LAYER 2: SCOPE BOUNDARY FIREWALL ───
    if (OFFTOPIC_INSPECTION_REGEX.test(query)) {
      const scopeBlockedMsg: ChatMessage = {
        id: `scope-${Date.now()}`,
        role: "assistant",
        isSecurityNotice: true,
        content: "Scope Guard: Ask ClipVault is strictly restricted to analyzing the current video's spoken dialogue. I cannot assist with general programming questions (e.g. 'what is python'), world trivia, or political queries. Please ask questions about the moments, topics, or dialogue in this video.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, scopeBlockedMsg]);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/ask_video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: query,
          url: ytUrl || activeVideoUrl || "",
          local_path: localFilePath || "",
          api_key: keyInfo.key,
          ai_engine: keyInfo.engine || selectedEngine || "gemini",
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();

      if (data.status === "api_key_required") {
        setShowKeyModal(true);
        const keyReqMsg: ChatMessage = {
          id: `key-req-${Date.now()}`,
          role: "assistant",
          isSecurityNotice: true,
          content: "API Key Required: Please put an API key first in Engine Settings before using AI chat.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, keyReqMsg]);
        return;
      }

      const assistantMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: data.answer || "Here is what I found in the video transcript.",
        moments: Array.isArray(data.moments) ? data.moments : [],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: "I had trouble scanning this video. Please make sure the video has an active preview or YouTube link.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([]);
    setInputText("");
  };

  const handlePinClip = (moment: VideoMoment, indexKey: string) => {
    if (onSetClipBounds) {
      onSetClipBounds(moment.start, moment.end);
      setPinnedMomentIndex(indexKey);
      setTimeout(() => setPinnedMomentIndex(null), 2500);
    }
  };

  // Floating popup modal when user clicks locked AI chat without API key
  const renderKeyModal = () => (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none"
      onClick={() => setShowKeyModal(false)}
    >
      <div
        className="relative w-full max-w-sm bg-[#12110c] border border-emerald-400/40 rounded-3xl p-6 shadow-[0_20px_70px_rgba(0,0,0,0.95)] flex flex-col items-center text-center space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setShowKeyModal(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
          <Lock className="w-7 h-7" />
        </div>

        <div className="space-y-1.5">
          <h3 className="text-base font-black text-white tracking-wide">
            Please Put an API Key First
          </h3>
          <p className="text-xs text-gray-300 leading-relaxed font-medium">
            {activeEngineName
              ? `No API key was detected for ${activeEngineName}. AI chat is disabled until your API key is configured.`
              : "Ask ClipVault AI chat requires a personal API key to analyze video transcripts. No API key was detected."}
          </p>
        </div>

        <div className="w-full p-3 rounded-2xl bg-emerald-400/10 border border-emerald-400/20 text-[11px] text-emerald-300 text-left flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span className="leading-tight">
            Security Guarantee: Your keys are encrypted locally with on-device protection and never shared.
          </span>
        </div>

        <div className="w-full space-y-2 pt-1">
          {onOpenEngineSettings && (
            <button
              type="button"
              onClick={() => {
                setShowKeyModal(false);
                onOpenEngineSettings();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <Key className="w-3.5 h-3.5 text-black" />
              <span>Configure API Key</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowKeyModal(false)}
            className="w-full py-2 rounded-xl text-gray-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );

  // Minimized floating launcher button
  if (!isOpen) {
    return (
      <>
        <button
          type="button"
          onClick={() => {
            if (!hasApiKey) {
              setShowKeyModal(true);
            } else {
              onOpen();
            }
          }}
          title={hasApiKey ? "Open Ask ClipVault (AI Video Assistant)" : "Please put an API key first (AI Chat is Locked)"}
          className={`absolute bottom-6 right-6 z-30 group flex items-center gap-2.5 px-4 py-2.5 rounded-full border text-white font-medium text-xs backdrop-blur-xl transition-all duration-200 ${
            hasApiKey
              ? "bg-[#080d0a]/90 hover:bg-[#0c140f] border-[#34eb3d]/40 shadow-[0_8px_32px_rgba(52, 235, 61,0.25)] hover:shadow-[0_8px_36px_rgba(52, 235, 61,0.45)] ring-1 ring-[#34eb3d]/25 hover:scale-105 cursor-pointer"
              : "bg-[#141416]/80 hover:bg-[#1c1c1f] border-zinc-700/60 shadow-none ring-1 ring-white/5 opacity-60 grayscale cursor-not-allowed"
          }`}
        >
          <div className={`w-5 h-5 rounded-full flex items-center justify-center shadow-inner ${
            hasApiKey ? "bg-gradient-to-tr from-[#34eb3d] to-[#5def64] text-black" : "bg-zinc-700 text-zinc-400"
          }`}>
            {hasApiKey ? (
              <Sparkles className="w-3 h-3 text-black animate-pulse" />
            ) : (
              <Lock className="w-2.5 h-2.5 text-zinc-300" />
            )}
          </div>
          <span className={hasApiKey ? "bg-gradient-to-r from-emerald-200 to-[#34eb3d] bg-clip-text text-transparent font-bold tracking-wide" : "text-zinc-400 font-bold"}>
            Ask ClipVault
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
            hasApiKey ? "bg-[#34eb3d]/20 text-[#34eb3d] border border-[#34eb3d]/30" : "bg-red-500/15 text-red-400 border border-red-500/25"
          }`}>
            {hasApiKey ? "AI" : "LOCKED"}
          </span>
        </button>

        {showKeyModal && renderKeyModal()}
      </>
    );
  }

  // Expanded Ask ClipVault Drawer / Card
  return (
    <div className="absolute right-6 top-6 bottom-6 w-[380px] max-w-[calc(100vw-3rem)] z-30 flex flex-col bg-[#0d0c0a]/95 backdrop-blur-2xl border border-emerald-400/25 rounded-3xl shadow-[0_20px_70px_rgba(0,0,0,0.9)] overflow-hidden transition-all duration-300 ring-1 ring-white/10">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-xl flex items-center justify-center shadow-md ${
            hasApiKey ? "bg-gradient-to-tr from-emerald-500 to-yellow-400 text-black" : "bg-zinc-700 text-zinc-300"
          }`}>
            {hasApiKey ? <Sparkles className="w-4 h-4 text-black" /> : <Lock className="w-3.5 h-3.5" />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              Ask ClipVault
            </h3>
            <p className="text-[10px] text-emerald-400/70">Video Transcript Intelligence</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {messages.length > 0 && hasApiKey && (
            <button
              type="button"
              onClick={handleResetChat}
              title="Start New Chat"
              className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-300 hover:bg-white/10 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            title="Close Panel"
            className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-300 hover:bg-white/10 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative flex-1 flex flex-col overflow-hidden">
        {/* ── SECURITY GATING OVERLAY (WHEN NO API KEY IS CONFIGURED) ─── */}
        {!hasApiKey && (
          <div className="absolute inset-0 z-20 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-4 select-none">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-400/40 flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.2)] text-emerald-400">
              <Lock className="w-7 h-7" />
            </div>

            <div className="space-y-1.5 max-w-[280px]">
              <h3 className="text-base font-black text-white tracking-wide">
                Please Put an API Key First
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed font-medium">
                {activeEngineName
                  ? `No API key detected for ${activeEngineName}. AI chat is disabled until your API key is provided.`
                  : "Ask ClipVault is strictly locked to your personal API key and local hardware. Please configure your key first."}
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-400/10 border border-emerald-400/25 text-[11px] text-emerald-300/90 leading-tight flex items-center gap-2 max-w-[300px] text-left">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Zero-leakage security: Keys are encrypted locally and never shared.</span>
            </div>

            {onOpenEngineSettings && (
              <button
                type="button"
                onClick={() => {
                  onOpenEngineSettings();
                  setShowKeyModal(false);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all hover:scale-[1.02] cursor-pointer"
              >
                <Key className="w-3.5 h-3.5 text-black" />
                <span>Configure API Key</span>
              </button>
            )}
          </div>
        )}

        {/* Chat Area / Body */}
        <div ref={scrollRef} className={`flex-1 overflow-y-auto p-4 space-y-4 text-xs select-text ${!hasApiKey ? "filter blur-sm opacity-30 pointer-events-none" : ""}`}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-start pt-2 space-y-4">
              {/* Gradient Greeting matching YouTube Studio in Yellow/Amber */}
              <div className="space-y-1">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-300 via-emerald-400 to-yellow-500 bg-clip-text text-transparent">
                  How can I help you?
                </h2>
                <p className="text-xs text-gray-400">
                  Ask anything about this video or tap a suggestion to find key moments instantly.
                </p>
              </div>

              {/* Quick Suggestion Chips */}
              <div className="flex flex-col gap-2 w-full pt-2">
                {DEFAULT_SUGGESTIONS.map((suggestion, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(suggestion)}
                    disabled={isLoading || !hasApiKey}
                    className="w-full text-left px-3.5 py-2.5 rounded-2xl bg-[#141412] hover:bg-[#1e1c14] border border-white/5 hover:border-emerald-400/35 text-gray-200 hover:text-white text-xs transition-all duration-150 flex items-center justify-between group cursor-pointer shadow-sm disabled:cursor-not-allowed"
                  >
                    <span className="line-clamp-2 pr-2">{suggestion}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-emerald-400 transition-colors flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === "user" ? "items-end" : "items-start"
                } space-y-1`}
              >
                {msg.role === "user" ? (
                  <div className="max-w-[85%] px-3.5 py-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-yellow-500 text-black font-semibold shadow-md text-xs leading-relaxed">
                    {msg.content}
                  </div>
                ) : (
                  <div className="w-full space-y-3">
                    {/* Formatted Markdown / text answer */}
                    <div className={`w-full p-3.5 rounded-2xl shadow-sm border transition-all ${
                      msg.isSecurityNotice
                        ? "bg-emerald-950/30 border-emerald-400/40 text-emerald-200"
                        : "bg-[#141310] border-white/10 text-gray-200"
                    }`}>
                      <AssistantMessageBody
                        content={msg.content}
                        isSecurityNotice={msg.isSecurityNotice}
                      />
                    </div>

                    {/* Interactive Moment Cards */}
                    {msg.moments && msg.moments.length > 0 && (
                      <div className="space-y-2 w-full pt-1">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 px-1">
                          <Flame className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Featured Video Moments ({msg.moments.length})</span>
                        </div>

                        {msg.moments.map((moment, mIdx) => {
                          const cardKey = `${msg.id}-${mIdx}`;
                          const isPinned = pinnedMomentIndex === cardKey;

                          return (
                            <div
                              key={cardKey}
                              className="p-3 rounded-2xl bg-[#161511] border border-emerald-400/25 hover:border-emerald-400/50 transition-all space-y-2 shadow-sm"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-400/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-400/35">
                                    <Clock className="w-2.5 h-2.5" />
                                    {moment.label}
                                  </span>
                                  <h4 className="text-xs font-semibold text-white mt-1 leading-snug">
                                    {moment.title}
                                  </h4>
                                </div>
                              </div>

                              {moment.reason && (
                                <p className="text-[11px] text-gray-300 leading-relaxed italic bg-black/30 p-2 rounded-xl border border-white/5">
                                  {moment.reason}
                                </p>
                              )}

                              <div className="flex items-center gap-2 pt-1">
                                {onSeek && (
                                  <button
                                    type="button"
                                    onClick={() => onSeek(moment.start)}
                                    className="flex-1 py-1.5 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 hover:text-white font-medium text-[10px] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                  >
                                    <Play className="w-2.5 h-2.5 text-emerald-400 fill-emerald-400" />
                                    <span>Jump to {moment.label.split(" - ")[0] || moment.label}</span>
                                  </button>
                                )}

                                {onSetClipBounds && (
                                  <button
                                    type="button"
                                    onClick={() => handlePinClip(moment, cardKey)}
                                    className={`flex-1 py-1.5 px-2.5 rounded-xl border font-bold text-[10px] flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                      isPinned
                                        ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                                        : "bg-emerald-400/20 hover:bg-emerald-400/30 border-emerald-400/40 text-emerald-300 hover:text-emerald-200"
                                    }`}
                                  >
                                    {isPinned ? (
                                      <>
                                        <Check className="w-3 h-3 text-emerald-400" />
                                        <span>Bounds Pinned!</span>
                                      </>
                                    ) : (
                                      <>
                                        <Scissors className="w-3 h-3 text-emerald-300" />
                                        <span>Set as Clip</span>
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}

          {/* Thinking Indicator */}
          {isLoading && (
            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-[#141310] border border-emerald-400/20 text-emerald-300 text-xs">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              <span className="animate-pulse">Ask ClipVault is analyzing video transcript...</span>
            </div>
          )}
        </div>
      </div>

      {/* Input Bar & Footer */}
      <div
        onClick={() => {
          if (!hasApiKey) setShowKeyModal(true);
        }}
        className={`p-3 border-t border-white/10 bg-black/40 space-y-2 ${
          !hasApiKey ? "grayscale opacity-40 cursor-not-allowed bg-[#0d0d10]" : ""
        }`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!hasApiKey) {
              setShowKeyModal(true);
              return;
            }
            handleSendMessage();
          }}
          className="flex items-center gap-2 bg-[#141310] border border-white/10 focus-within:border-emerald-400/60 rounded-2xl px-3 py-2 transition-all shadow-inner"
        >
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={hasApiKey ? "Ask something about this video..." : "Please put an API key first..."}
            disabled={isLoading || !hasApiKey}
            className="flex-1 bg-transparent text-white text-xs outline-none placeholder-gray-500 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading || !hasApiKey}
            className="p-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black disabled:bg-zinc-800 disabled:text-zinc-600 transition-all cursor-pointer disabled:cursor-not-allowed shadow-sm font-bold"
          >
            <Send className="w-3.5 h-3.5 text-black" />
          </button>
        </form>

        <p className="text-[10px] text-gray-500 text-center leading-tight">
          Strict video analysis scope. API credentials and system data are fully protected.
        </p>
      </div>

      {showKeyModal && renderKeyModal()}
    </div>
  );
}
