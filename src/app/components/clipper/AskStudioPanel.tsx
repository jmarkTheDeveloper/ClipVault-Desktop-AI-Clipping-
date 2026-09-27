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
  Flame
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
}

const DEFAULT_SUGGESTIONS = [
  "Give me timestamps of the most interesting moments",
  "Summarize what this video is about",
  "Find the funniest or most intense moments",
  "What are the main topics discussed?",
  "When does the conversation get deep or controversial?",
];

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
}: AskStudioPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pinnedMomentIndex, setPinnedMomentIndex] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || isLoading) return;

    setInputText("");

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/ask_video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: query,
          url: ytUrl || activeVideoUrl || "",
          local_path: localFilePath || "",
          api_key: localStorage.getItem("clipvault_gemini_key") || undefined,
          ai_engine: "gemini",
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
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

  // Minimized floating launcher button
  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={onOpen}
        title="Open Ask Studio (AI Video Assistant)"
        className="absolute bottom-6 right-6 z-30 group flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-[#12110c]/90 hover:bg-[#1a180f] border border-amber-400/40 text-white font-medium text-xs shadow-[0_8px_32px_rgba(245,158,11,0.25)] hover:shadow-[0_8px_36px_rgba(245,158,11,0.45)] backdrop-blur-xl transition-all duration-200 hover:scale-105 cursor-pointer ring-1 ring-amber-400/20"
      >
        <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-black shadow-inner">
          <Sparkles className="w-3 h-3 text-black animate-pulse" />
        </div>
        <span className="bg-gradient-to-r from-amber-200 via-amber-300 to-yellow-400 bg-clip-text text-transparent font-bold tracking-wide">
          Ask Studio
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30 font-bold">
          AI
        </span>
      </button>
    );
  }

  // Expanded Ask Studio Drawer / Card
  return (
    <div className="absolute right-6 top-6 bottom-6 w-[380px] max-w-[calc(100vw-3rem)] z-30 flex flex-col bg-[#0d0c0a]/95 backdrop-blur-2xl border border-amber-400/25 rounded-3xl shadow-[0_20px_70px_rgba(0,0,0,0.9)] overflow-hidden transition-all duration-300 ring-1 ring-white/10">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-black shadow-md">
            <Sparkles className="w-4 h-4 text-black" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-1.5">
              Ask Studio
            </h3>
            <p className="text-[10px] text-amber-400/70">Video Transcript Intelligence</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleResetChat}
              title="Start New Chat"
              className="p-1.5 rounded-lg text-gray-400 hover:text-amber-300 hover:bg-white/10 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            title="Close Panel"
            className="p-1.5 rounded-lg text-gray-400 hover:text-amber-300 hover:bg-white/10 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chat Area / Body */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 text-xs select-text">
        {messages.length === 0 ? (
          <div className="flex flex-col items-start pt-2 space-y-4">
            {/* Gradient Greeting matching YouTube Studio in Yellow/Amber */}
            <div className="space-y-1">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
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
                  disabled={isLoading}
                  className="w-full text-left px-3.5 py-2.5 rounded-2xl bg-[#141412] hover:bg-[#1e1c14] border border-white/5 hover:border-amber-400/35 text-gray-200 hover:text-white text-xs transition-all duration-150 flex items-center justify-between group cursor-pointer shadow-sm"
                >
                  <span className="line-clamp-2 pr-2">{suggestion}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-amber-400 transition-colors flex-shrink-0" />
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
                <div className="max-w-[85%] px-3.5 py-2 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-semibold shadow-md text-xs leading-relaxed">
                  {msg.content}
                </div>
              ) : (
                <div className="w-full space-y-3">
                  {/* Markdown / text answer */}
                  <div className="w-full px-3.5 py-3 rounded-2xl bg-[#141310] border border-white/10 text-gray-200 text-xs leading-relaxed space-y-2 whitespace-pre-line shadow-sm">
                    {msg.content}
                  </div>

                  {/* Interactive Moment Cards */}
                  {msg.moments && msg.moments.length > 0 && (
                    <div className="space-y-2 w-full pt-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-400 px-1">
                        <Flame className="w-3.5 h-3.5 text-amber-400" />
                        <span>Featured Video Moments ({msg.moments.length})</span>
                      </div>

                      {msg.moments.map((moment, mIdx) => {
                        const cardKey = `${msg.id}-${mIdx}`;
                        const isPinned = pinnedMomentIndex === cardKey;

                        return (
                          <div
                            key={cardKey}
                            className="p-3 rounded-2xl bg-[#161511] border border-amber-400/25 hover:border-amber-400/50 transition-all space-y-2 shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-400/20 text-amber-300 font-mono text-[10px] font-bold border border-amber-400/35">
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
                                  <Play className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
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
                                      : "bg-amber-400/20 hover:bg-amber-400/30 border-amber-400/40 text-amber-300 hover:text-amber-200"
                                  }`}
                                >
                                  {isPinned ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-400" />
                                      <span>Bounds Pinned!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Scissors className="w-3 h-3 text-amber-300" />
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
          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-[#141310] border border-amber-400/20 text-amber-300 text-xs">
            <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            <span className="animate-pulse">Ask Studio is analyzing video transcript...</span>
          </div>
        )}
      </div>

      {/* Input Bar & Footer */}
      <div className="p-3 border-t border-white/10 bg-black/40 space-y-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2 bg-[#141310] border border-white/10 focus-within:border-amber-400/60 rounded-2xl px-3 py-2 transition-all shadow-inner"
        >
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask something about this video..."
            disabled={isLoading}
            className="flex-1 bg-transparent text-white text-xs outline-none placeholder-gray-500"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="p-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-black hover:from-amber-300 hover:to-yellow-400 disabled:bg-gray-800 disabled:text-gray-600 transition-all cursor-pointer disabled:cursor-not-allowed shadow-sm font-bold"
          >
            <Send className="w-3.5 h-3.5 text-black" />
          </button>
        </form>

        <p className="text-[10px] text-gray-500 text-center leading-tight">
          AI can make mistakes. You are responsible for the content you publish.
        </p>
      </div>
    </div>
  );
}
