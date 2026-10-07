import React from "react";
import {
  X,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Download,
  ShieldCheck,
  Bug,
  Zap,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { APP_CHANGELOG } from "../data/changelog";

export interface UpdateState {
  status: "idle" | "checking" | "downloading" | "ready";
  version?: string;
  progress?: number;
  releaseNotes?: string | string[];
}

interface UpdateNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  updateState?: UpdateState;
  onRestartAndInstall?: () => void;
  onCheckForUpdates?: () => void;
  isCheckingUpdates?: boolean;
}

export const UpdateNotificationModal: React.FC<UpdateNotificationModalProps> = ({
  isOpen,
  onClose,
  updateState = { status: "idle" },
  onRestartAndInstall,
  onCheckForUpdates,
  isCheckingUpdates = false,
}) => {
  if (!isOpen) return null;

  const currentRelease = APP_CHANGELOG[0] || {
    version: "1.0.0",
    date: "October 2026",
    title: "Production Release",
    highlights: "Continuous stability improvements and automated bug resolution",
    items: [],
  };
  const isDownloading = updateState.status === "downloading";
  const isReady = updateState.status === "ready";
  const isChecking = isCheckingUpdates || updateState.status === "checking";

  return (
    <div
      className="fixed inset-0 z-[10000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative bg-[#0c0f14] border border-white/10 rounded-3xl max-w-2xl w-full max-h-[88vh] shadow-2xl flex flex-col overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
        style={{
          boxShadow: "0 32px 100px rgba(0,0,0,0.95), 0 0 50px rgba(52, 235, 61, 0.15)",
        }}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/10 bg-[#080b0f]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#34eb3d]/15 border border-[#34eb3d]/30 flex items-center justify-center text-[#34eb3d] shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  ClipVault Updates &amp; Bug Fixes
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#34eb3d]/15 text-[#34eb3d] border border-[#34eb3d]/30">
                  v{currentRelease.version}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Here&apos;s what we improved and fixed to make your clipping experience smoother.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 custom-scrollbar">
          {/* Ongoing Update Banner */}
          {isDownloading && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col gap-3 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5" />
                    Update Ongoing in Background: v{updateState.version || "New"}
                  </span>
                </div>
                <span className="text-xs font-mono font-extrabold text-amber-400">
                  {updateState.progress || 0}%
                </span>
              </div>
              <p className="text-[11px] text-gray-300 leading-relaxed">
                ClipVault is downloading the latest bug fixes and improvements quietly. Your ongoing editing will continue without interruption.
              </p>
              <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden border border-white/5">
                <div
                  className="bg-gradient-to-r from-amber-400 to-[#34eb3d] h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(5, updateState.progress || 0)}%` }}
                />
              </div>
            </div>
          )}

          {/* Update Ready Banner */}
          {isReady && (
            <div className="p-4 rounded-2xl bg-[#34eb3d]/10 border border-[#34eb3d]/40 flex items-center justify-between gap-4 animate-in fade-in duration-300 shadow-[0_0_25px_rgba(52,235,61,0.15)]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#34eb3d] text-black font-extrabold flex items-center justify-center flex-shrink-0 shadow-md">
                  <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">
                    Update v{updateState.version || "New"} Ready to Install!
                  </h4>
                  <p className="text-[11px] text-gray-300">
                    Restart now to apply the latest improvements and bug fixes.
                  </p>
                </div>
              </div>

              {onRestartAndInstall && (
                <button
                  onClick={onRestartAndInstall}
                  className="px-4 py-2 bg-[#34eb3d] hover:bg-[#2dca34] text-black text-xs font-extrabold rounded-xl transition-all shadow-md cursor-pointer flex-shrink-0 flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Restart &amp; Apply
                </button>
              )}
            </div>
          )}

          {/* Up to date / Manual Check Banner when not downloading or ready */}
          {!isDownloading && !isReady && (
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#34eb3d]" />
                <span className="text-xs text-gray-300">
                  {isChecking
                    ? "Checking for new bug fixes & updates..."
                    : "You're using the latest, most stable version of ClipVault (v" + currentRelease.version + ")."}
                </span>
              </div>

              {onCheckForUpdates && (
                <button
                  onClick={onCheckForUpdates}
                  disabled={isChecking}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-300 hover:text-white border border-white/10 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-3 h-3 text-[#34eb3d] ${isChecking ? "animate-spin" : ""}`}
                  />
                  <span>{isChecking ? "Checking..." : "Check for Updates"}</span>
                </button>
              )}
            </div>
          )}

          {/* Release Highlights Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                <Bug className="w-3.5 h-3.5 text-[#34eb3d]" />
                What&apos;s New &amp; What We Fixed (v{currentRelease.version})
              </h3>
              <span className="text-[11px] text-gray-500">{currentRelease.date}</span>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              {currentRelease.highlights}
            </p>

            {/* List of Fixed Bugs */}
            <div className="space-y-2.5 pt-1">
              {currentRelease.items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/10 hover:border-white/20 transition-all flex items-start gap-3"
                >
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold ${
                      item.type === "fix"
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : item.type === "security"
                        ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                        : item.type === "perf"
                        ? "bg-purple-500/15 text-purple-400 border border-purple-500/30"
                        : "bg-[#34eb3d]/15 text-[#34eb3d] border border-[#34eb3d]/30"
                    }`}
                  >
                    {item.type === "fix" ? (
                      <Bug className="w-3.5 h-3.5" />
                    ) : item.type === "security" ? (
                      <ShieldCheck className="w-3.5 h-3.5" />
                    ) : item.type === "perf" ? (
                      <Zap className="w-3.5 h-3.5" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-bold text-white">
                        {item.title}
                      </span>
                      {item.badge && (
                        <span className="text-[9.5px] font-mono font-bold px-1.5 py-0.2 rounded bg-white/10 text-gray-300">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11.5px] text-gray-400 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-[#080b0f] flex items-center justify-between">
          <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34eb3d]" />
            ClipVault automatically checks for new improvements when it opens so you&apos;re always up to date.
          </div>

          <div className="flex items-center gap-2">
            {isReady && onRestartAndInstall ? (
              <button
                onClick={onRestartAndInstall}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#34eb3d] hover:bg-[#2dca34] text-black transition-all shadow-md cursor-pointer"
              >
                Restart &amp; Install
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white transition-all cursor-pointer"
              >
                Got It
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
