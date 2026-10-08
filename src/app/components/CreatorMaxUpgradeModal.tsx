import React, { useEffect } from "react";
import {
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Lock,
  X,
  Zap,
  Sliders,
  ArrowRight,
} from "lucide-react";

interface CreatorMaxUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToAutoClipper?: () => void;
  resetsInDays?: number;
  resetsAt?: string;
}

const LEMON_MAX_CHECKOUT_URL =
  "https://clipvault.lemonsqueezy.com/checkout/buy/2dbb1ba7-c3e4-414b-99e9-a1a1a385ac49";

export function CreatorMaxUpgradeModal({
  isOpen,
  onClose,
  onSwitchToAutoClipper,
  resetsInDays = 7,
  resetsAt,
}: CreatorMaxUpgradeModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const handleOpenCheckout = () => {
    try {
      const electronAPI = (window as any).electronAPI;
      if (electronAPI && electronAPI.openExternal) {
        electronAPI.openExternal(LEMON_MAX_CHECKOUT_URL);
      } else {
        window.open(LEMON_MAX_CHECKOUT_URL, "_blank", "noopener,noreferrer");
      }
    } catch {
      window.open(LEMON_MAX_CHECKOUT_URL, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center pt-14 pb-4 px-4 animate-in fade-in duration-200 cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-2xl bg-[#0c0d12] border border-[#34eb3d]/40 shadow-[0_0_60px_rgba(52,235,61,0.18)] p-6 sm:p-8 text-zinc-100 overflow-hidden cursor-default"
      >
        {/* Top ambient highlight */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#34eb3d] to-transparent" />

        {/* Close Button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
          className="absolute top-4 right-4 z-50 p-2 rounded-xl text-zinc-400 hover:text-white bg-white/[0.04] hover:bg-white/10 border border-white/10 transition-all cursor-pointer shadow-sm group"
          title="Close"
          aria-label="Close"
        >
          <X className="w-4 h-4 pointer-events-none group-hover:scale-110 transition-transform" />
        </button>

        {/* Header Badge */}
        <div className="flex items-center gap-2 mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#34eb3d]/10 border border-[#34eb3d]/30 text-[#34eb3d] text-[11px] font-bold uppercase tracking-wider">
            <Lock className="w-3 h-3" />
            <span>Weekly Editor Limit Reached</span>
          </div>
        </div>

        {/* Title & Description */}
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-2">
          Upgrade to Creator Max
        </h2>
        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mb-6">
          Your Creator Pro ($11/mo) subscription includes 3 weekly clips in the Pro Timeline Editor.
          You have utilized all 3 clips for this 7-day period. Your editor credits will refresh in{" "}
          <span className="text-[#34eb3d] font-bold">
            {resetsInDays} {resetsInDays === 1 ? "day" : "days"}
          </span>
          {resetsAt ? ` (${resetsAt})` : ""}.
        </p>

        {/* Comparison Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {/* Current Tier */}
          <div className="rounded-xl p-3.5 bg-white/[0.02] border border-white/10 text-xs space-y-2">
            <div className="font-bold text-zinc-300 flex items-center justify-between">
              <span>Creator Pro</span>
              <span className="text-zinc-500 font-normal">$11 / mo</span>
            </div>
            <div className="space-y-1.5 text-[11px] text-zinc-400">
              <div className="flex items-center gap-1.5 text-zinc-200">
                <CheckCircle2 className="w-3 h-3 text-[#34eb3d] shrink-0" />
                <span>Unlimited 1-Click Auto Clipper</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-300">
                <Lock className="w-3 h-3 shrink-0" />
                <span>3 Pro Editor Clips / Week (Used)</span>
              </div>
            </div>
          </div>

          {/* Upgrade Tier */}
          <div className="rounded-xl p-3.5 bg-[#34eb3d]/[0.06] border border-[#34eb3d]/40 text-xs space-y-2 relative shadow-[0_0_20px_rgba(52,235,61,0.12)]">
            <div className="font-bold text-white flex items-center justify-between">
              <span className="text-[#34eb3d]">Creator Max</span>
              <div className="text-right">
                <span className="text-zinc-200 font-bold">$15 / mo</span>
                <span className="text-[10px] text-[#34eb3d] block font-mono">or $119/yr (Save 34%)</span>
              </div>
            </div>
            <div className="space-y-1.5 text-[11px] text-zinc-300">
              <div className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3 h-3 text-[#34eb3d] shrink-0" />
                <span>Unlimited 1-Click Auto Clipper</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium text-white">
                <Sparkles className="w-3 h-3 text-[#34eb3d] shrink-0" />
                <span className="font-semibold text-[#34eb3d]">Unlimited Pro Timeline Editor</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-[#34eb3d] shrink-0" />
                <span>Up to 3 Workstation Activations</span>
              </div>
            </div>
          </div>
        </div>

        {/* CTAs */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={handleOpenCheckout}
            className="w-full py-3 px-4 rounded-xl bg-[#34eb3d] text-black font-extrabold text-xs flex items-center justify-center gap-2 hover:bg-[#2dca34] transition-all shadow-[0_0_25px_rgba(52,235,61,0.35)] hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          >
            <span>Upgrade to Creator Max ($15/mo or $119/yr)</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          {onSwitchToAutoClipper && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onSwitchToAutoClipper();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs flex items-center justify-center gap-2 border border-white/10 transition-colors cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-[#34eb3d]" />
              <span>Use 1-Click Auto Clipper (100% Unlimited)</span>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-zinc-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
